export default {
  plugins: [
    { name: 'plugin1', settings: {} },
    { name: 'plugin2', settings: {} }
  ],
  database: {
    type: 'postgresql',
    dbName: 'test',
    host: 'localhost'
  }
} 