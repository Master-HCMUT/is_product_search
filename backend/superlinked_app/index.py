from superlinked import framework as sl

from superlinked_app.config import settings


# =============================================================================
# Schema: defines the shape of a product record
# =============================================================================

@sl.schema
class Product:
    id: sl.IdField
    # Embedded fields for semantic search
    title: sl.String
    description: sl.String  # description + features concatenated
    # Numeric fields for preference-based ranking
    price: sl.Float
    average_rating: sl.Float
    rating_number: sl.Integer
    # Non-embedded fields for filtering and display
    store: sl.String
    main_category: sl.String
    image_url: sl.String


product = Product()

# =============================================================================
# Spaces: define how each field is embedded into vector space
# =============================================================================

# Title text similarity (semantic search on product titles)
title_space = sl.TextSimilaritySpace(
    text=product.title,
    model=settings.text_embedder_name,
)

# Description text similarity (semantic search on description + features)
description_space = sl.TextSimilaritySpace(
    text=product.description,
    model=settings.text_embedder_name,
)

# Price minimizer: prefer cheaper products when weight > 0
price_space = sl.NumberSpace(
    product.price,
    min_value=0,
    max_value=7000,
    mode=sl.Mode.MINIMUM,
)

# Rating maximizer: prefer higher rated products when weight > 0
rating_space = sl.NumberSpace(
    product.average_rating,
    min_value=0,
    max_value=5,
    mode=sl.Mode.MAXIMUM,
)

# =============================================================================
# Index: combines spaces + filterable/displayable fields
# =============================================================================

index = sl.Index(
    spaces=[
        title_space,
        description_space,
        price_space,
        rating_space,
    ],
    fields=[
        product.price,
        product.average_rating,
        product.rating_number,
        product.store,
        product.main_category,
        product.image_url,
        product.title,
    ],
)
