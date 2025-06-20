// Add shutdown handler
process.on('SIGTERM', async () => {
  console.log('Server is shutting down...');
  try {
    // Call cleanup endpoint
    await fetch('http://localhost:3000/api/auth/cleanup', {
      method: 'POST',
    });
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during server shutdown cleanup:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Server is being interrupted...');
  try {
    // Call cleanup endpoint
    await fetch('http://localhost:3000/api/auth/cleanup', {
      method: 'POST',
    });
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during server interruption cleanup:', error);
  }
  process.exit(0);
}); 