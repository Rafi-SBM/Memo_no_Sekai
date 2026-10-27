#!/bin/bash

# Simple Deployment Script for Memo no Sekai
echo "🚀 Deploying Memo no Sekai..."

# Check if we have the HTML file
if [ ! -f "Memo-no-Sekai.html" ]; then
    echo "❌ Memo-no-Sekai.html not found!"
    exit 1
fi

# Create a simple index.html that redirects to our main file
echo "📝 Creating index.html redirect..."
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memo no Sekai - Redirecting...</title>
    <script>
        // Redirect to the main application
        window.location.href = 'Memo-no-Sekai.html';
    </script>
</head>
<body>
    <p>Redirecting to Memo no Sekai...</p>
    <p>If you're not redirected automatically, <a href="Memo-no-Sekai.html">click here</a>.</p>
</body>
</html>
EOF

echo "✅ Deployment files ready!"
echo ""
echo "🌐 To deploy:"
echo "1. Upload Memo-no-Sekai.html and app.png to your web server"
echo "2. Or use any static hosting service (Netlify, Vercel, GitHub Pages)"
echo "3. Or run locally with: python -m http.server 8000"
echo ""
echo "🎉 Your single-file application is ready to deploy!"