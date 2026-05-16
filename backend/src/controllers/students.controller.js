import fs from 'fs';
import csv from 'csv-parser';
import supabase from '../config/supabase.js';

export const importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const { branch_id, academic_year_id } = req.body;

    if (!branch_id || !academic_year_id) {
      return res.status(400).json({ error: 'branch_id and academic_year_id are required' });
    }

    // Read CSV file
    const rows = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Fetch all sections for this branch and academic year
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('id, name, semester')
      .eq('branch_id', branch_id)
      .eq('academic_year_id', academic_year_id);

    if (sectionsError || !sections.length) {
      return res.status(404).json({ error: 'No sections found for this branch and academic year' });
    }

    // Build section lookup map → { "BA-3": uuid, "BB-3": uuid }
    const sectionMap = {};
    sections.forEach(sec => {
      const key = `${sec.name.trim().toUpperCase()}-${sec.semester}`;
      sectionMap[key] = sec.id;
    });

    const results = {
      success: [],
      failed: []
    };

    // Process each row
    for (const row of rows) {
      const reg_no       = row.reg_no?.trim();
      const name         = row.name?.trim();
      const email        = row.email?.trim();
      const phone        = row.phone?.trim();
      const father_name  = row.father_name?.trim();
      const mother_name  = row.mother_name?.trim();
      const parent_phone = row.parent_phone?.trim();
      const sectionName  = row.section?.trim().toUpperCase();
      const semester     = parseInt(row.semester?.trim());

      // Validate required fields
      if (!reg_no || !name || !email || !sectionName || !semester) {
        results.failed.push({
          reg_no: reg_no || 'unknown',
          name: name || 'unknown',
          reason: 'Missing required fields (reg_no, name, email, section, semester)'
        });
        continue;
      }

      // Find section id
      const sectionKey = `${sectionName}-${semester}`;
      const sectionId = sectionMap[sectionKey];

      if (!sectionId) {
        results.failed.push({
          reg_no,
          name,
          reason: `Section "${sectionName}" with semester ${semester} not found`
        });
        continue;
      }

      // Check if student already exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('reg_no', reg_no)
        .single();

      if (existingStudent) {
        results.failed.push({
          reg_no,
          name,
          reason: 'Student with this reg_no already exists'
        });
        continue;
      }

      // Create Supabase Auth user
      // Default password = reg_no
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: reg_no,
        email_confirm: true
      });

      if (authError) {
        results.failed.push({
          reg_no,
          name,
          reason: `Auth creation failed: ${authError.message}`
        });
        continue;
      }

      // Insert into students table
      const { error: insertError } = await supabase
        .from('students')
        .insert({
          user_id:          authData.user.id,
          reg_no,
          name,
          email,
          phone,
          father_name,
          mother_name,
          parent_phone,
          section_id:       sectionId,
          academic_year_id,
          semester
        });

      if (insertError) {
        // Rollback auth user if student insert fails
        await supabase.auth.admin.deleteUser(authData.user.id);

        results.failed.push({
          reg_no,
          name,
          reason: `Database insert failed: ${insertError.message}`
        });
        continue;
      }

      results.success.push({ reg_no, name, email, section: sectionName, semester });
    }

    // Delete uploaded temp file
    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      message: 'Import completed',
      total: rows.length,
      success_count: results.success.length,
      failed_count: results.failed.length,
      success: results.success,
      failed: results.failed
    });

  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: err.message });
  }
};