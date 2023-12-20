import { Server } from './server';

// Main entry point of the application
async function main() {
  try {
    const port = process.env.PORT || 3000; // Use environment variable for port or default to 3000
    const server = new Server(); // Create an instance of your server

    await server.start(Number(port)); // Start the server
    console.log(`Server is running on port ${port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

main();
