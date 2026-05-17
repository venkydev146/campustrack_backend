

import supabase from '../config/supabase.js';

// Enter marks for entire section
export const enterMarks = async (req, res) => {
  try {
    let { assignment_id, exam_type, max_marks, records } = req.body;

    // Map old exam types to new ones
    const examTypeMap = {
      'CIA1':  'CAT-1',
      'CIA2':  'CAT-2',
      'MODEL': 'CAT-3',
      'FINAL': 'THEORY'
    };
    exam_type = examTypeMap[exam_type] || exam_type;

    console.log('Mapped exam_type:', exam_type);

    const marksData = records.map(r => ({
      staff_subject_assignment_id: assignment_id,
      student_id:       r.student_id,
      academic_year_id: r.academic_year_id,
      exam_type,
      max_marks,
      scored_marks:     r.scored_marks
    }));

    const { error } = await supabase
      .from('marks')
      .upsert(marksData, {
        onConflict: 'staff_subject_assignment_id,student_id,exam_type'
      });

    if (error) throw error;

    return res.status(201).json({ message: 'Marks entered successfully' });

  } catch (err) {
    console.error('Enter marks error:', err);
    return res.status(500).json({ error: 'Failed to enter marks' });
  }
};

// Get marks for a section by subject and exam type
export const getSectionMarks = async (req, res) => {
  try {
    const { assignment_id, exam_type } = req.query;

    const { data, error } = await supabase
      .from('marks')
      .select(`
        id, exam_type, max_marks, scored_marks,
        students ( id, name, reg_no )
      `)
      .eq('staff_subject_assignment_id', assignment_id)
      .eq('exam_type', exam_type)
      .order('students(reg_no)');

    if (error) throw error;

    return res.status(200).json(data);

  } catch (err) {
     console.error('Get section marks error:', err);
    return res.status(500).json({ error: 'Failed to fetch marks' });
  }
};

// Get all marks for a student
export const getStudentMarks = async (req, res) => {
  try {
    const { student_id } = req.params;

    const { data, error } = await supabase
      .from('marks')
      .select(`
        exam_type, max_marks, scored_marks,
        staff_subject_assignments (
          subjects ( name, code )
        )
      `)
      .eq('student_id', student_id);

    if (error) throw error;

    // Group by subject
    const subjectMap = {};

    data.forEach(mark => {
      const subject = mark.staff_subject_assignments?.subjects?.name;
      if (!subject) return;

      if (!subjectMap[subject]) {
        subjectMap[subject] = { subject, code: mark.staff_subject_assignments.subjects.code };
      }

      subjectMap[subject][mark.exam_type] = {
        scored: mark.scored_marks,
        max: mark.max_marks
      };
    });

    return res.status(200).json(Object.values(subjectMap));

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch student marks' });
  }
};