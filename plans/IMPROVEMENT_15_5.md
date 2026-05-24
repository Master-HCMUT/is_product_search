# Improvement plans from Sarah Chen (VP of Product)

## Customer homepage
1. User home page for product discovery is too boring. Make it more friendlier. Some key ideas: Devide by main category: all. amazon_fashion,...; add aminations,..., brainstorming to improve the ux. 
2. View the product is also too boring. The description is too long, it concat all the information and we cant focus on the main product feature. Fix it. Also, although this is POC, we should have add to cart, purchase,... just to demo in the UI
3. In the view product page, we can suggest similar products, e.g, using full text search with Qdrant or Superlinked
4. Refine the data. Now regeneration the data from huggingface, keep only the one having price and  image.
5. Improve superlinked query also. Alow to filter by main_category. For the max price and min price, all categories,.. we should look at the real data rather than some random hardcoding value
6. Other things you suggest to improve the product. Make it competitive 