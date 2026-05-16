import supabase from '../config/supabase.js';

// Check if session exists
export const checkSession = async (req, res) => {
  try {
    const { timetable_entry_id, date } = req.query;

    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('id, status')
      .eq('timetable_entry_id', timetable_entry_id)
      .eq('date', date)
      .single();

    if (!data) {
      return res.status(200).json({ exists: false });
    }

    return res.status(200).json({
      exists: true,
      session_id: data.id,
      status: data.status
    });

  } catch (err) {
    return res.status(200).json({ exists: false });
  }
};

// Start attendance session
export const startSession = async (req, res) => {
  try {
    const { timetable_entry_id, date } = req.body;
    const staffId = req.profile.id;

    // Check if already exists
    const { data: existing } = await supabase
      .from('attendance_sessions')
      .select('id, status')
      .eq('timetable_entry_id', timetable_entry_id)
      .eq('date', date)
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'Session already exists',
        session_id: existing.id,
        status: existing.status
      });
    }

    // Get timetable entry details
    const { data: entryData, error: entryError } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        time_slots ( period_number, start_time, end_time, label ),
        staff_subject_assignments (
          id,
          subjects ( name, code ),
          sections ( id, name )
        )
      `)
      .eq('id', timetable_entry_id)
      .single();

    if (entryError || !entryData) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }

    const sectionId = entryData.staff_subject_assignments.sections.id;

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .insert({
        timetable_entry_id,
        staff_id: staffId,
        date,
        status: 'open'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Auto-fetch students from section
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, reg_no')
      .eq('section_id', sectionId)
      .order('reg_no');

    if (studentsError) throw studentsError;

    return res.status(201).json({
      session_id: session.id,
      date,
      subject: entryData.staff_subject_assignments.subjects.name,
      subject_code: entryData.staff_subject_assignments.subjects.code,
      section: entryData.staff_subject_assignments.sections.name,
      period: entryData.time_slots.label,
      start_time: entryData.time_slots.start_time,
      end_time: entryData.time_slots.end_time,
      students
    });

  } catch (err) {
      console.error('Start session error:', err);
    return res.status(500).json({ error: 'Failed to start session' });
  }
};

// Submit attendance
export const submitSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { records } = req.body;

    // Check session status
    const { data: session } = await supabase
      .from('attendance_sessions')
      .select('status')
      .eq('id', id)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'locked') {
      return res.status(400).json({ error: 'Session is locked and cannot be modified' });
    }

    // Insert attendance records
    const attendanceRecords = records.map(r => ({
      session_id: id,
      student_id: r.student_id,
      status: r.status,
      marked_at: new Date().toISOString()
    }));

    const { error: recordsError } = await supabase
      .from('attendance_records')
      .upsert(attendanceRecords, {
        onConflict: 'session_id,student_id'
      });

    if (recordsError) throw recordsError;

    // Update session status
    await supabase
      .from('attendance_sessions')
      .update({ status: 'submitted' })
      .eq('id', id);

    return res.status(200).json({ message: 'Attendance submitted successfully' });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit attendance' });
  }
};

// Get session with records
export const getSession = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .select(`
        id, date, status,
        timetable_entries (
          time_slots ( period_number, label, start_time, end_time ),
          staff_subject_assignments (
            subjects ( name, code ),
            sections ( name )
          )
        ),
        attendance_records (
          id, status, marked_at,
          students ( id, name, reg_no )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json(session);

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
};

// Get student attendance summary
export const getStudentAttendance = async (req, res) => {
  try {
    const { student_id } = req.params;

    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        status,
        attendance_sessions (
          date,
          timetable_entries (
            staff_subject_assignments (
              subjects ( name, code )
            )
          )
        )
      `)
      .eq('student_id', student_id);

    if (error) throw error;

    // Group by subject and calculate percentage
    const subjectMap = {};

    data.forEach(record => {
      const subject =
        record.attendance_sessions?.timetable_entries
          ?.staff_subject_assignments?.subjects?.name;

      if (!subject) return;

      if (!subjectMap[subject]) {
        subjectMap[subject] = { total: 0, present: 0, absent: 0, late: 0 };
      }

      subjectMap[subject].total++;
      subjectMap[subject][record.status]++;
    });

    const summary = Object.entries(subjectMap).map(([subject, counts]) => ({
      subject,
      total_classes: counts.total,
      present: counts.present,
      absent: counts.absent,
      late: counts.late,
      percentage: ((counts.present + counts.late) / counts.total * 100).toFixed(2)
    }));

    return res.status(200).json(summary);

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const getStudentsBySection = async (req, res) => {
  try {
    const { section_id } = req.query;

    const { data, error } = await supabase
      .from('students')
      .select('id, name, reg_no')
      .eq('section_id', section_id)
      .order('reg_no');

    if (error) throw error;

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
export const getDailyAttendance = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { date }       = req.query;

    if (!date) return res.status(400).json({ error: 'Date is required' });

    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        status,
        attendance_sessions (
          date,
          timetable_entries (
            time_slots ( period_number, label, start_time, end_time ),
            staff_subject_assignments (
              subjects ( name, code )
            )
          )
        )
      `)
      .eq('student_id', student_id)
      .eq('attendance_sessions.date', date);

    if (error) throw error;

    const filtered = data.filter(r => r.attendance_sessions !== null);

    const result = filtered.map(r => ({
      subject: r.attendance_sessions.timetable_entries.staff_subject_assignments.subjects.name,
      period:  r.attendance_sessions.timetable_entries.time_slots.period_number,
      label:   r.attendance_sessions.timetable_entries.time_slots.label,
      status:  r.status
    }));

    return res.status(200).json(result);

  } catch (err) {
    console.error('Daily attendance error:', err);
    return res.status(500).json({ error: err.message });
  }
};
export const getMonthlyAttendance = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month required' });
    }

    // Build date range for the month
    const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
    const endDate   = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        status,
        attendance_sessions (
          date
        )
      `)
      .eq('student_id', student_id)
      .gte('attendance_sessions.date', startDate)
      .lte('attendance_sessions.date', endDate);

    if (error) throw error;

    // Build { "YYYY-MM-DD": "present"|"absent" } map
    const result = {};
    data
      .filter(r => r.attendance_sessions !== null)
      .forEach(r => {
        const date = r.attendance_sessions.date;
        // If multiple records same day → present wins
        if (!result[date] || r.status === 'present') {
          result[date] = r.status;
        }
      });

    return res.status(200).json(result);

  } catch (err) {
    console.error('Monthly attendance error:', err);
    return res.status(500).json({ error: err.message });
  }
};