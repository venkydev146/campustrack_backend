import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAuthUsers() {

  // Fetch all students without auth users
  const { data: students, error } = await supabase
    .from('students')
    .select('id, name, reg_no, email')
    .is('user_id', null);

  if (error) {
    console.error('Failed to fetch students:', error);
    return;
  }

  console.log(`Found ${students.length} students without auth users`);

  const results = { success: [], failed: [] };

  for (const student of students) {

    // Default password = reg_no
    const password = student.reg_no;

    try {
      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email:         student.email,
        password:      password,
        email_confirm: true
      });

      if (authError) {
        results.failed.push({ reg_no: student.reg_no, name: student.name, reason: authError.message });
        continue;
      }

      // Update student record with user_id
      const { error: updateError } = await supabase
        .from('students')
        .update({ user_id: authData.user.id })
        .eq('id', student.id);

      if (updateError) {
        results.failed.push({ reg_no: student.reg_no, name: student.name, reason: updateError.message });
        continue;
      }

      results.success.push({ reg_no: student.reg_no, name: student.name });
      console.log(`✅ Created: ${student.name} (${student.reg_no})`);

    } catch (err) {
      results.failed.push({ reg_no: student.reg_no, name: student.name, reason: err.message });
    }
  }

  console.log('\n══════════════════════════════');
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`❌ Failed:  ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed students:');
    results.failed.forEach(f => {
      console.log(`  - ${f.name} (${f.reg_no}): ${f.reason}`);
    });
  }

  console.log('══════════════════════════════');
}

createAuthUsers();