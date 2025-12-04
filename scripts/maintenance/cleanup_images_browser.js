// Run this script in your browser console while logged in as admin
// This will trigger the image cleanup API endpoint

async function cleanupImages() {
    try {
        console.log('🧹 Starting image cleanup...');
        
        const response = await fetch('/api/products/cleanup-images', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Image cleanup completed!');
            console.log(`📊 Results:`);
            console.log(`   - Total products processed: ${result.totalProducts}`);
            console.log(`   - Products updated: ${result.updatedProducts}`);
            console.log(`   - Images cleaned: ${result.cleanedImages}`);
            
            if (result.updatedProducts > 0) {
                console.log('🔄 Refreshing page to see changes...');
                window.location.reload();
            } else {
                console.log('ℹ️ No images needed cleanup');
            }
        } else {
            console.error('❌ Cleanup failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

// Run the cleanup
cleanupImages();