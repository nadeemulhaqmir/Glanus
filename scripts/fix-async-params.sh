#!/bin/bash

# Fix Next.js 15 async params in all dynamic route handlers

echo "Fixing Next.js 15 async params in API routes..."

# Files to fix
files=(
  "app/api/admin/actions/[id]/route.ts"
  "app/api/admin/fields/[id]/route.ts"
  "app/api/relationships/[id]/route.ts"
  "app/api/assets/[id]/schema/route.ts"
  "app/api/assets/[id]/relationships/route.ts"
  "app/api/assets/[id]/actions/[actionSlug]/route.ts"
  "app/api/dynamic-assets/[id]/route.ts"
  "app/api/executions/[id]/route.ts"
  "app/api/admin/categories/[id]/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Add Promise<> wrapper and await params extraction
    # Pattern 1: Single id param
    sed -i '' 's/{ params }: { params: { id: string } }/{ params }: Promise<{ id: string }>/g' "$file"
    
    # Pattern 2: id + actionSlug params  
    sed -i '' 's/{ params }: { params: { id: string; actionSlug: string } }/{ params }: Promise<{ id: string; actionSlug: string }>/g' "$file"
    
    # Add await for params destructuring - this needs manual review
    # sed -i '' 's/const { id } = params;/const { id } = await params;/g' "$file"
    # sed -i '' 's/const { id, actionSlug } = params;/const { id, actionSlug } = await params;/g' "$file"
    
    echo "✅ Fixed $file"
  else
    echo "⚠️  Skipped $file (not found)"
  fi
done

echo ""
echo "Done! Now manually add 'await' before params destructuring in each file."
