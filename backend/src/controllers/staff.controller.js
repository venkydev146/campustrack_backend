import supabase from '../config/supabase.js';

// Get all subject-section assignments for logged in staff
export const getAssignments = async (req, res) => {
  try {
    const staffId = req.profile.id;

    const { data, error } = await supabase
      .from('staff_subject_assignments')
      .select(`
        id,
        subjects ( id, name, code ),
        sections ( id, name ),
        academic_years ( id, label, is_current )
      `)
      .eq('staff_id', staffId)
      .eq('academic_years.is_current', true);

    if (error) throw error;

    // Filter only current academic year
    const filtered = data.filter(a => a.academic_years?.is_current === true);

    const assignments = filtered.map(a => ({
      assignment_id: a.id,
      subject_id:    a.subjects.id,
      subject_name:  a.subjects.name,
      subject_code:  a.subjects.code,
      section_id:    a.sections.id,
      section_name:  a.sections.name,
    }));

    return res.status(200).json(assignments);

  } catch (err) {
    console.error('Get assignments error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Get unique sections for logged in staff
export const getSections = async (req, res) => {
  try {
    const staffId = req.profile.id;

    const { data, error } = await supabase
      .from('staff_subject_assignments')
      .select(`
        sections ( id, name ),
        academic_years ( is_current )
      `)
      .eq('staff_id', staffId)
      .eq('academic_years.is_current', true);

    if (error) throw error;

    // Unique sections only
    const seen     = new Set();
    const sections = [];

    data
      .filter(a => a.academic_years?.is_current === true)
      .forEach(a => {
        if (!seen.has(a.sections.id)) {
          seen.add(a.sections.id);
          sections.push({
            section_id:   a.sections.id,
            section_name: a.sections.name
          });
        }
      });

    return res.status(200).json(sections);

  } catch (err) {
    console.error('Get sections error:', err);
    return res.status(500).json({ error: err.message });
  }
};