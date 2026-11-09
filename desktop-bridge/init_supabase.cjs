const { Pool } = require('C:/Users/777/OneDrive/Desktop/MIQORA/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.unncxmxmcrknulznfcpx:Simoraoripova19@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function init() {
  console.log('Connecting to Supabase PostgreSQL at aws-0-ap-northeast-1.pooler.supabase.com...');
  
  // 1. Create table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.jarvis_tasks (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'TASK',
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      time_str TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('1. Created public.jarvis_tasks table in Supabase.');

  // 2. Grant permissions & RLS policies
  await pool.query(`
    GRANT ALL ON public.jarvis_tasks TO postgres, anon, authenticated, service_role;
    ALTER TABLE public.jarvis_tasks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public all access on jarvis_tasks" ON public.jarvis_tasks;
    CREATE POLICY "Allow public all access on jarvis_tasks" ON public.jarvis_tasks FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('2. Granted permissions and enabled open public RLS policy.');

  // 3. Seed default lesson and coffee tasks
  const defaultTasks = [
    {
      id: 'lesson-coffee-appeal',
      text: "☕️ O'quvchilarga qoida: Mening xo'jayinim Simora xonimni ko'p urintirmanglar va darsda unga issiq coffee taklif qilinglar! 😄☕️",
      category: 'URGENT',
      completed: false,
      time_str: '☕️ Qoida'
    },
    {
      id: 'lesson-advice-simora',
      text: "💡 Simora xonimga tavsiya: Jonli namoyish (30–45 daq) va amaliy mashqda o'quvchilar faolligini oshiring, real keyslar berib qiziqtiring!",
      category: 'ADVICE',
      completed: false,
      time_str: '💡 Tavsiya'
    },
    {
      id: 'lesson-main',
      text: "Soat 20:30 — AI vositalari va vazifaga mos vosita tanlash darsi (90 daqiqa)",
      category: 'URGENT',
      completed: false,
      time_str: '20:30'
    },
    {
      id: 'lesson-step-1',
      text: "20:30–20:35: 1-darsni eslash (ANI va AGI farqi)",
      category: 'TASK',
      completed: false,
      time_str: '20:30'
    },
    {
      id: 'lesson-step-2',
      text: "20:35–20:45: AI va kasblardagi vazifalarning o'zgarishi",
      category: 'TASK',
      completed: false,
      time_str: '20:35'
    },
    {
      id: 'lesson-step-3',
      text: "20:45–21:00: AI vositalari turlari va ularning qo'llanishi",
      category: 'TASK',
      completed: false,
      time_str: '20:45'
    },
    {
      id: 'lesson-step-4',
      text: "21:00–21:15: Vositalar imkoniyatlari va jonli namoyish",
      category: 'TASK',
      completed: false,
      time_str: '21:00'
    },
    {
      id: 'lesson-step-5',
      text: "21:15–21:25: Xatolar, cheklovlar va javoblarni tekshirish",
      category: 'TASK',
      completed: false,
      time_str: '21:15'
    },
    {
      id: 'lesson-step-6',
      text: "21:25–21:35: Vazifaga mos vositani tanlash mezonlari",
      category: 'TASK',
      completed: false,
      time_str: '21:25'
    },
    {
      id: 'lesson-step-7',
      text: "21:35–21:55: Vositalarni solishtirish, amaliy mashq va muhokama",
      category: 'TASK',
      completed: false,
      time_str: '21:35'
    },
    {
      id: 'lesson-step-8',
      text: "21:55–22:00: Mustahkamlash va uy vazifasi",
      category: 'REMINDER',
      completed: false,
      time_str: '21:55'
    }
  ];

  for (const t of defaultTasks) {
    await pool.query(`
      INSERT INTO public.jarvis_tasks (id, text, category, completed, time_str, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE 
      SET text = EXCLUDED.text,
          category = EXCLUDED.category,
          time_str = EXCLUDED.time_str,
          updated_at = NOW()
    `, [t.id, t.text, t.category, t.completed, t.time_str]);
  }
  console.log('3. Seeded 11 daily lesson tasks and coffee rules into Supabase.');

  // 4. Verify count
  const countRes = await pool.query(`SELECT COUNT(*) as total FROM public.jarvis_tasks`);
  console.log(`4. VERIFIED: Supabase public.jarvis_tasks has ${countRes.rows[0].total} rows.`);

  await pool.end();
}

init().catch(err => {
  console.error('INIT ERROR:', err);
  pool.end();
});
