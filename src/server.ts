import app from './app'

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => console.log(`Express is running on http://localhost:${PORT}`))