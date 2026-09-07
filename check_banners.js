const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gdhtydiycsgxcxestwin.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkaHR5ZGl5Y3NneGN4ZXN0d2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTQyMDUsImV4cCI6MjA4ODM3MDIwNX0.nbMCxiA4z35d3Mf7jjQ2PygmRZdIfDuweC3inm0sRC0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBanners() {
  const { data, error } = await supabase.from('promotional_banners').select('*').eq('is_active', true);
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}
checkBanners();
