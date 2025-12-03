from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import numpy as np
from typing import Dict, Any
import os

app = FastAPI(title="Pneumonia Detection API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Device configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Model definitions
class MLP(nn.Module):
    """Multi-Layer Perceptron for DenseNet features"""
    def __init__(self, input_dim=1024, num_classes=2):
        super().__init__()
        self.model = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, x):
        return self.model(x)


class DenseNetMLP:
    """DenseNet121 + MLP model - handles both combined and separate saves"""
    def __init__(self, model_path: str):
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        state_dict = checkpoint['model_state_dict']
        
        print(f"Loading DenseNetMLP from {model_path}")
        print(f"Keys in state_dict: {list(state_dict.keys())[:5]}...")  # Debug
        
        # Check what type of model was saved
        has_features = any('features' in key for key in state_dict.keys())
        has_model_prefix = any('model.' in key for key in state_dict.keys())
        
        if has_features:
            # Full DenseNet model saved
            print("Detected: Full DenseNet model")
            self.model = models.densenet121(weights=None)
            
            # Check if classifier is MLP or Linear
            if 'classifier.model.0.weight' in state_dict:
                # MLP classifier
                self.model.classifier = MLP(1024, 2)
            else:
                # Linear classifier  
                self.model.classifier = nn.Linear(1024, 2)
            
            self.model.load_state_dict(state_dict)
            self.model = self.model.to(device)
            self.model.eval()
            self.use_combined = True
            
        elif has_model_prefix:
            # Just MLP saved with 'model.' prefix
            print("Detected: MLP only (with model prefix)")
            self.densenet = models.densenet121(weights='DEFAULT')
            self.densenet.classifier = nn.Identity()
            
            for param in self.densenet.parameters():
                param.requires_grad = False
            
            self.mlp = MLP(1024, 2)
            self.mlp.load_state_dict(state_dict)
            
            self.densenet = self.densenet.to(device)
            self.mlp = self.mlp.to(device)
            self.densenet.eval()
            self.mlp.eval()
            self.use_combined = False
        else:
            # Direct MLP weights or other format
            print("Detected: Direct weights format")
            self.densenet = models.densenet121(weights='DEFAULT')
            self.densenet.classifier = nn.Identity()
            
            for param in self.densenet.parameters():
                param.requires_grad = False
            
            self.mlp = MLP(1024, 2)
            try:
                self.mlp.load_state_dict(state_dict)
            except:
                # Try loading into the Sequential model directly
                self.mlp.model.load_state_dict(state_dict)
            
            self.densenet = self.densenet.to(device)
            self.mlp = self.mlp.to(device)
            self.densenet.eval()
            self.mlp.eval()
            self.use_combined = False
    
    def predict(self, image_tensor):
        with torch.no_grad():
            if self.use_combined:
                outputs = self.model(image_tensor)
            else:
                features = self.densenet(image_tensor)
                features = features.view(features.size(0), -1)
                outputs = self.mlp(features)
            
            probabilities = torch.softmax(outputs, dim=1)
            _, predicted = torch.max(outputs, 1)
            
            # Debug logging
            print(f"\n🔍 DEBUG - MLP Model:")
            print(f"   Raw outputs: {outputs[0].cpu().numpy()}")
            print(f"   Probabilities: {probabilities[0].cpu().numpy()}")
            print(f"   Predicted index: {predicted.item()}")
            print(f"   Predicted class: NORMAL if 0, PNEUMONIA if 1")
            
        return predicted.item(), probabilities[0].cpu().numpy()


class DenseNetFineTuned:
    """Fine-tuned DenseNet121 model - handles different save formats"""
    def __init__(self, model_path: str):
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        state_dict = checkpoint['model_state_dict']
        
        print(f"Loading DenseNetFineTuned from {model_path}")
        print(f"Keys in state_dict: {list(state_dict.keys())[:5]}...")  # Debug
        
        # Check what's in the state dict
        has_classifier = any('classifier' in key for key in state_dict.keys())
        has_features = any('features' in key for key in state_dict.keys())
        
        self.model = models.densenet121(weights=None)
        num_ftrs = self.model.classifier.in_features
        
        if has_features and has_classifier:
            # Full model with classifier
            print("Detected: Full DenseNet with classifier")
            self.model.classifier = nn.Linear(num_ftrs, 2)
            self.model.load_state_dict(state_dict)
            
        elif has_features and not has_classifier:
            # Only features, no classifier
            print("Detected: DenseNet features only")
            features_state = {k: v for k, v in state_dict.items() if 'features' in k}
            self.model.load_state_dict(features_state, strict=False)
            # Initialize random classifier (not ideal, but works)
            self.model.classifier = nn.Linear(num_ftrs, 2)
            print("WARNING: Classifier not found in checkpoint, initialized randomly!")
            
        else:
            # Might be just classifier weights
            print("Detected: Classifier weights only")
            # Load pretrained features
            self.model = models.densenet121(weights='DEFAULT')
            
            # Try to load classifier
            try:
                self.model.classifier = nn.Linear(num_ftrs, 2)
                classifier_state = {k.replace('classifier.', ''): v for k, v in state_dict.items() if 'classifier' in k}
                self.model.classifier.load_state_dict(classifier_state)
            except:
                # If that fails, try as MLP
                try:
                    self.model.classifier = MLP(num_ftrs, 2)
                    self.model.classifier.load_state_dict(state_dict)
                except:
                    print("WARNING: Could not load classifier, using random initialization!")
                    self.model.classifier = nn.Linear(num_ftrs, 2)
        
        self.model = self.model.to(device)
        self.model.eval()
    
    def predict(self, image_tensor):
        with torch.no_grad():
            outputs = self.model(image_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            _, predicted = torch.max(outputs, 1)
            
            # Debug logging
            print(f"\n🔍 DEBUG - Fine-tuned Model:")
            print(f"   Raw outputs: {outputs[0].cpu().numpy()}")
            print(f"   Probabilities: {probabilities[0].cpu().numpy()}")
            print(f"   Predicted index: {predicted.item()}")
            print(f"   Predicted class: NORMAL if 0, PNEUMONIA if 1")
            
        return predicted.item(), probabilities[0].cpu().numpy()


# Image preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Model registry
MODELS = {
    "densenet_mlp": {
        "name": "DenseNet121 + MLP",
        "description": "DenseNet121 feature extractor with Multi-Layer Perceptron classifier",
        "architecture": "DenseNet121 (frozen) + 3-layer MLP (512→256→2)",
        "training": "Transfer learning with MLP trained on extracted features",
        "parameters": "~7M (trainable: ~1.5M)",
        "model_path": "models/model_transform.pkl"
    },
    "densenet_finetuned": {
        "name": "DenseNet121 Fine-tuned",
        "description": "DenseNet121 with fine-tuned classifier layer",
        "architecture": "DenseNet121 (frozen backbone) + Linear classifier",
        "training": "Transfer learning with classifier fine-tuning",
        "parameters": "~7M (trainable: ~2K)",
        "model_path": "models/model_smot.pkl"
    }
}

# Store loaded models
loaded_models: Dict[str, Any] = {}

# Class names - CRITICAL: This must match training order
CLASS_NAMES = ["NORMAL", "PNEUMONIA"]  # Index 0=NORMAL, Index 1=PNEUMONIA


@app.on_event("startup")
async def load_models():
    """Load models on startup (if available)"""
    print(f"\n{'='*60}")
    print(f"PNEUMONIA DETECTION API")
    print(f"{'='*60}")
    print(f"Using device: {device}")
    print(f"Class mapping: 0=NORMAL, 1=PNEUMONIA")
    print(f"{'='*60}\n")


@app.get("/")
async def root():
    return {"message": "Pneumonia Detection API", "status": "running"}


@app.get("/models")
async def get_models():
    """Get available models and their details"""
    available_models = []
    
    for model_id, info in MODELS.items():
        model_exists = os.path.exists(info["model_path"])
        
        model_info = {
            "id": model_id,
            "name": info["name"],
            "description": info["description"],
            "architecture": info["architecture"],
            "training": info["training"],
            "parameters": info["parameters"],
            "available": model_exists,
            "status": "ready" if model_exists else "model file missing"
        }
        available_models.append(model_info)
    
    return {"models": available_models}


@app.post("/predict/{model_id}")
async def predict(model_id: str, file: UploadFile = File(...)):
    """Make prediction using selected model"""
    
    # Validate model ID
    if model_id not in MODELS:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read and preprocess image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Transform image
        image_tensor = transform(image).unsqueeze(0).to(device)
        
        # Load model if not already loaded
        if model_id not in loaded_models:
            model_path = MODELS[model_id]["model_path"]
            
            if not os.path.exists(model_path):
                raise HTTPException(
                    status_code=500,
                    detail=f"Model file not found: {model_path}"
                )
            
            try:
                if model_id == "densenet_mlp":
                    loaded_models[model_id] = DenseNetMLP(model_path)
                elif model_id == "densenet_finetuned":
                    loaded_models[model_id] = DenseNetFineTuned(model_path)
                print(f"✅ Model loaded: {model_id}")
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error loading model: {str(e)}"
                )
        
        # Make prediction
        model = loaded_models[model_id]
        prediction_index, probabilities = model.predict(image_tensor)
        
        # CRITICAL: Verify the prediction mapping
        print(f"\n📊 FINAL RESULT:")
        print(f"   Prediction index: {prediction_index}")
        print(f"   Predicted as: {CLASS_NAMES[prediction_index]}")
        print(f"   Confidence: {probabilities[prediction_index] * 100:.2f}%")
        print(f"   Prob[NORMAL]: {probabilities[0] * 100:.2f}%")
        print(f"   Prob[PNEUMONIA]: {probabilities[1] * 100:.2f}%\n")
        
        # Prepare response
        result = {
            "model": MODELS[model_id]["name"],
            "prediction": CLASS_NAMES[prediction_index],
            "confidence": float(probabilities[prediction_index]) * 100,
            "probabilities": {
                "NORMAL": float(probabilities[0]) * 100,
                "PNEUMONIA": float(probabilities[1]) * 100
            }
        }
        
        return JSONResponse(content=result)
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "device": str(device),
        "loaded_models": list(loaded_models.keys()),
        "class_mapping": {
            "0": "NORMAL",
            "1": "PNEUMONIA"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8927)