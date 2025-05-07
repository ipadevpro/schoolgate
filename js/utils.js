/**
 * Utility functions for SchoolGate
 */

/**
 * Get the base path for the application
 * This helps resolve paths correctly whether running locally or on a server
 * @returns {string} The base path
 */
function getBasePath() {
    // Extract the base path from the current URL
    // For local file system access, we'll use relative paths
    // For server deployment, we'll use absolute paths
    const isLocal = window.location.protocol === 'file:';
    
    if (isLocal) {
        // Running locally with file:// protocol
        const path = window.location.pathname;
        
        // Determine the current depth in the directory structure
        const parts = path.split('/');
        const filename = parts[parts.length - 1];
        
        // If we're in index.html in the root
        if (filename === 'index.html' && !path.includes('/student/') && !path.includes('/teacher/')) {
            return './';
        }
        
        // If we're in a subdirectory (student/ or teacher/)
        if (path.includes('/student/') || path.includes('/teacher/')) {
            return '../';
        }
        
        return './';
    } else {
        // Running on a web server
        return '/';
    }
}

/**
 * Resolve a relative path against the application base path
 * @param {string} path - The relative path to resolve
 * @returns {string} The resolved path
 */
function resolvePath(path) {
    // Remove leading slash if exists and the path is not just '/'
    const cleanPath = path.startsWith('/') && path !== '/' ? path.substring(1) : path;
    return getBasePath() + cleanPath;
} 