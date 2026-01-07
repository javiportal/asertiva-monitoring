"""
Tests for the normalizer module.
"""

import pytest

from watchguard.normalizer import (
    compute_hash,
    generate_source_id,
    normalize,
    texts_are_similar,
)


class TestNormalize:
    """Tests for the normalize function."""
    
    def test_removes_dates_slash_format(self):
        text = "Updated 01/15/2024 by admin"
        result = normalize(text)
        assert "01/15/2024" not in result
        assert "updated" in result
        assert "admin" in result
    
    def test_removes_dates_spanish_format(self):
        text = "Publicado el 15 de enero de 2024"
        result = normalize(text)
        assert "15 de enero de 2024" not in result
        assert "publicado" in result
    
    def test_removes_visit_counters(self):
        text = "Contenido importante. Visitas: 12345"
        result = normalize(text)
        assert "12345" not in result
        assert "visitas" not in result
        assert "contenido importante" in result
    
    def test_removes_last_updated(self):
        text = "Artículo 1. Última actualización: 15/01/2024 10:30"
        result = normalize(text)
        assert "última actualización" not in result
        assert "artículo 1" in result
    
    def test_removes_copyright(self):
        text = "Contenido legal. © 2024 Gobierno de México"
        result = normalize(text)
        assert "© 2024" not in result
        assert "contenido legal" in result
    
    def test_collapses_whitespace(self):
        text = "Hello    world\n\n\ntest"
        result = normalize(text)
        assert "  " not in result
        assert "\n" not in result
    
    def test_lowercases(self):
        text = "IMPORTANTE: Nueva Regulación"
        result = normalize(text)
        assert result == "importante: nueva regulación"
    
    def test_unicode_normalization(self):
        # NFKC should normalize special characters
        text = "Ｈｅｌｌｏ"  # Fullwidth characters
        result = normalize(text)
        assert "hello" in result
    
    def test_empty_string(self):
        assert normalize("") == ""
        assert normalize(None) == ""  # Should handle None gracefully


class TestComputeHash:
    """Tests for hash computation."""
    
    def test_consistent_hash(self):
        text = "same content"
        hash1 = compute_hash(text)
        hash2 = compute_hash(text)
        assert hash1 == hash2
    
    def test_different_content_different_hash(self):
        hash1 = compute_hash("content a")
        hash2 = compute_hash("content b")
        assert hash1 != hash2
    
    def test_hash_length(self):
        # SHA-256 produces 64 hex characters
        hash_value = compute_hash("test")
        assert len(hash_value) == 64
    
    def test_hash_is_hex(self):
        hash_value = compute_hash("test")
        # Should only contain hex characters
        assert all(c in "0123456789abcdef" for c in hash_value)


class TestGenerateSourceId:
    """Tests for source ID generation."""
    
    def test_format(self):
        source_id = generate_source_id("https://example.com/page", timestamp=1705334400)
        assert source_id.startswith("watchguard:")
        assert ":1705334400" in source_id
    
    def test_consistent_url_hash(self):
        # Same URL should produce same hash prefix
        id1 = generate_source_id("https://example.com/page", timestamp=1)
        id2 = generate_source_id("https://example.com/page", timestamp=2)
        
        # Extract hash portion (between first and second colon)
        hash1 = id1.split(":")[1]
        hash2 = id2.split(":")[1]
        assert hash1 == hash2
    
    def test_different_urls_different_hash(self):
        id1 = generate_source_id("https://example.com/page1", timestamp=1)
        id2 = generate_source_id("https://example.com/page2", timestamp=1)
        
        hash1 = id1.split(":")[1]
        hash2 = id2.split(":")[1]
        assert hash1 != hash2


class TestTextsAreSimilar:
    """Tests for similarity detection."""
    
    def test_identical_texts(self):
        text = "some content here"
        assert texts_are_similar(text, text) is True
    
    def test_very_different_texts(self):
        text1 = "completely different content"
        text2 = "nothing alike whatsoever here"
        assert texts_are_similar(text1, text2) is False
    
    def test_minor_difference(self):
        text1 = "this is a test of the similarity function"
        text2 = "this is a test of the similarity functions"  # Added 's'
        assert texts_are_similar(text1, text2, threshold=0.95) is True
    
    def test_empty_texts(self):
        assert texts_are_similar("", "") is True
        assert texts_are_similar("content", "") is False
        assert texts_are_similar("", "content") is False