#!/bin/bash

echo "🧹 Fixing placeholder images..."

echo "Step 1: Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "Step 2: The image filtering has been updated to remove:"
echo "   ❌ placehold.co images"  
echo "   ❌ placeholder.com images"
echo "   ❌ via.placeholder.com images"
echo "   ❌ Any URLs containing 'placeholder'"
echo "   ❌ example.com images"

echo "✅ Your website will now hide blank placeholder images!"
echo "✅ Components will show nice fallbacks instead of broken images."

echo "Done! Restart your development server to see the changes."