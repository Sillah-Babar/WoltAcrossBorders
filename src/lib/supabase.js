import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fdxdpqyhlvftoknpybno.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkeGRwcXlobHZmdG9rbnB5Ym5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzM0NTQsImV4cCI6MjA3ODc0OTQ1NH0.m9cliDpMiXeBACxfF_a_cRWStnbyUTp_iRIizBJAyzA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

