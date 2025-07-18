"""
NLP Microservice for Feedback Analysis
Uses Hugging Face Transformers for sentiment analysis and topic classification
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import asyncio
import logging
from datetime import datetime
import os
import uvicorn

# Transformers and ML libraries
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
import numpy as np
from collections import Counter
import re

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Feedback NLP Analysis Service",
    description="Microservice for analyzing customer feedback using NLP",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class FeedbackAnalysisRequest(BaseModel):
    text: str
    language: Optional[str] = "auto"

class FeedbackAnalysisResponse(BaseModel):
    sentiment: str
    sentiment_score: float
    confidence: float
    topics: List[str]
    category_suggestions: List[Dict[str, float]]
    keywords: List[str]
    text_stats: Dict[str, int]
    processed_at: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    models_loaded: bool

# Global variables for models
sentiment_analyzer = None
topic_classifier = None
tokenizer = None

# Category mapping for Vietnamese feedback
CATEGORY_MAPPING = {
    "technical": ["lỗi", "bug", "không hoạt động", "bị lỗi", "technical", "error", "không load", "lag", "chậm"],
    "service": ["dịch vụ", "nhân viên", "hỗ trợ", "service", "support", "customer care", "tư vấn"],
    "product": ["sản phẩm", "chất lượng", "product", "quality", "tính năng", "feature"],
    "pricing": ["giá", "price", "cost", "phí", "expensive", "cheap", "đắt", "rẻ"],
    "delivery": ["giao hàng", "vận chuyển", "delivery", "shipping", "transport", "logistics"],
    "ui_ux": ["giao diện", "interface", "design", "ui", "ux", "user experience", "layout"],
    "general": ["general", "chung", "khác", "other", "feedback", "góp ý"]
}

async def load_models():
    """
    Load and initialize NLP models
    """
    global sentiment_analyzer, topic_classifier, tokenizer
    
    try:
        logger.info("Loading NLP models...")
        
        # Load sentiment analysis model (supports Vietnamese)
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=0 if torch.cuda.is_available() else -1
        )
        
        # Load tokenizer for text processing
        tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base")
        
        # For topic classification, we'll use a simpler keyword-based approach
        # In production, you might want to train a custom model
        logger.info("✅ NLP models loaded successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to load models: {str(e)}")
        raise

def preprocess_text(text: str) -> str:
    """
    Preprocess text for analysis
    """
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove special characters but keep Vietnamese characters
    text = re.sub(r'[^\w\s\u00C0-\u1EF9]', ' ', text)
    
    # Convert to lowercase
    text = text.lower()
    
    return text

def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    """
    Extract keywords from text
    """
    # Simple keyword extraction based on word frequency
    words = text.split()
    
    # Filter out common stop words (Vietnamese and English)
    stop_words = {
        'và', 'của', 'với', 'trong', 'có', 'được', 'cho', 'từ', 'một', 'này', 'đó',
        'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was',
        'for', 'with', 'be', 'by', 'an', 'or', 'it', 'this', 'that', 'i', 'you',
        'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their'
    }
    
    # Filter words
    filtered_words = [
        word for word in words 
        if len(word) > 2 and word not in stop_words
    ]
    
    # Count frequency
    word_counts = Counter(filtered_words)
    
    # Return top keywords
    return [word for word, count in word_counts.most_common(max_keywords)]

def classify_topics(text: str) -> List[str]:
    """
    Classify topics based on keywords
    """
    text_lower = text.lower()
    detected_topics = []
    
    for category, keywords in CATEGORY_MAPPING.items():
        for keyword in keywords:
            if keyword in text_lower:
                detected_topics.append(category)
                break
    
    # Return unique topics, default to 'general' if none found
    topics = list(set(detected_topics))
    return topics if topics else ['general']

def suggest_categories(text: str) -> List[Dict[str, float]]:
    """
    Suggest categories with confidence scores
    """
    text_lower = text.lower()
    category_scores = {}
    
    for category, keywords in CATEGORY_MAPPING.items():
        score = 0
        keyword_matches = 0
        
        for keyword in keywords:
            if keyword in text_lower:
                keyword_matches += 1
                # Higher score for longer matches
                score += len(keyword) * text_lower.count(keyword)
        
        if keyword_matches > 0:
            # Normalize score
            confidence = min(score / (len(text) + 1), 1.0)
            category_scores[category] = confidence
    
    # Sort by confidence
    sorted_categories = sorted(
        category_scores.items(), 
        key=lambda x: x[1], 
        reverse=True
    )
    
    return [
        {"category": cat, "confidence": score} 
        for cat, score in sorted_categories[:3]  # Top 3 suggestions
    ]

def calculate_text_stats(text: str) -> Dict[str, int]:
    """
    Calculate text statistics
    """
    words = text.split()
    sentences = text.split('.')
    
    return {
        "character_count": len(text),
        "word_count": len(words),
        "sentence_count": len([s for s in sentences if s.strip()]),
        "avg_word_length": int(np.mean([len(word) for word in words])) if words else 0
    }

def normalize_sentiment(label: str, score: float) -> tuple:
    """
    Normalize sentiment labels and scores
    """
    # Map different model outputs to consistent format
    label_mapping = {
        'POSITIVE': 'positive',
        'NEGATIVE': 'negative', 
        'NEUTRAL': 'neutral',
        'LABEL_0': 'negative',  # Some models use LABEL_0 for negative
        'LABEL_1': 'neutral',   # LABEL_1 for neutral
        'LABEL_2': 'positive'   # LABEL_2 for positive
    }
    
    normalized_label = label_mapping.get(label.upper(), 'neutral')
    
    # Convert score to range [-1, 1]
    if normalized_label == 'positive':
        normalized_score = score
    elif normalized_label == 'negative':
        normalized_score = -score
    else:
        normalized_score = 0.0
    
    return normalized_label, normalized_score

@app.on_event("startup")
async def startup_event():
    """
    Load models on startup
    """
    await load_models()

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        models_loaded=sentiment_analyzer is not None
    )

@app.post("/analyze", response_model=FeedbackAnalysisResponse)
async def analyze_feedback(request: FeedbackAnalysisRequest):
    """
    Analyze feedback text for sentiment, topics, and categories
    """
    try:
        if not request.text or len(request.text.strip()) < 5:
            raise HTTPException(
                status_code=400, 
                detail="Text must be at least 5 characters long"
            )
        
        if len(request.text) > 5000:
            raise HTTPException(
                status_code=400,
                detail="Text must be less than 5000 characters"
            )
        
        # Preprocess text
        processed_text = preprocess_text(request.text)
        
        # Sentiment analysis
        if sentiment_analyzer:
            sentiment_result = sentiment_analyzer(processed_text)[0]
            sentiment_label, sentiment_score = normalize_sentiment(
                sentiment_result['label'], 
                sentiment_result['score']
            )
            confidence = sentiment_result['score']
        else:
            # Fallback if model not loaded
            sentiment_label = 'neutral'
            sentiment_score = 0.0
            confidence = 0.0
        
        # Topic classification
        topics = classify_topics(processed_text)
        
        # Category suggestions
        category_suggestions = suggest_categories(processed_text)
        
        # Extract keywords
        keywords = extract_keywords(processed_text)
        
        # Calculate text statistics
        text_stats = calculate_text_stats(request.text)
        
        # Prepare response
        response = FeedbackAnalysisResponse(
            sentiment=sentiment_label,
            sentiment_score=sentiment_score,
            confidence=confidence,
            topics=topics,
            category_suggestions=category_suggestions,
            keywords=keywords,
            text_stats=text_stats,
            processed_at=datetime.now().isoformat()
        )
        
        logger.info(f"Analyzed feedback: sentiment={sentiment_label}, topics={topics}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/batch-analyze")
async def batch_analyze_feedback(texts: List[str]):
    """
    Analyze multiple feedback texts in batch
    """
    try:
        if len(texts) > 100:
            raise HTTPException(
                status_code=400,
                detail="Maximum 100 texts allowed per batch"
            )
        
        results = []
        
        for text in texts:
            if text and len(text.strip()) >= 5:
                request = FeedbackAnalysisRequest(text=text)
                result = await analyze_feedback(request)
                results.append(result)
            else:
                # Skip invalid texts
                results.append(None)
        
        return {"results": results}
        
    except Exception as e:
        logger.error(f"Batch analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail="Batch analysis failed")

@app.get("/categories")
async def get_available_categories():
    """
    Get available feedback categories
    """
    return {
        "categories": list(CATEGORY_MAPPING.keys()),
        "category_keywords": CATEGORY_MAPPING
    }

@app.get("/stats")
async def get_service_stats():
    """
    Get service statistics
    """
    return {
        "service_name": "Feedback NLP Analysis Service",
        "version": "1.0.0",
        "models_loaded": sentiment_analyzer is not None,
        "supported_languages": ["en", "vi"],
        "max_text_length": 5000,
        "categories_count": len(CATEGORY_MAPPING)
    }

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "nlpService:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
