// Vercel Function: semua request /api/* diarahkan ke sini (lihat vercel.json).
import { createApp } from '../server/app.js';
import { createSupabaseData } from '../server/data.js';

export default createApp(createSupabaseData());
