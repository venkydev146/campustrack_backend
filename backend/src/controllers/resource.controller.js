

import supabase from '../config/supabase.js';

// Upload resource
export const uploadResource = async (req, res) => {
  try {
    const { assignment_id, title, description, resource_type, file_url, resource_category, file_type } = req.body;

    if (!assignment_id || !title || !resource_type) {
      return res.status(400).json({ error: 'assignment_id, title and resource_type are required' });
    }

    // Get section and subject from assignment
    const { data: assignment, error: assignError } = await supabase
      .from('staff_subject_assignments')
      .select(`
        sections ( id, name ),
        subjects ( id, name, code )
      `)
      .eq('id', assignment_id)
      .single();

    if (assignError || !assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const { data, error } = await supabase
      .from('resources')
      .insert({
        staff_subject_assignment_id: assignment_id,
        title,
        description,
        resource_type,
        file_url:          file_url || null,
        resource_category: resource_category || resource_type,
        file_type:         file_type || 'link',
        section:           assignment.sections?.name || null,
        subject:           assignment.subjects?.name || null,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Resource uploaded successfully',
      resource: data
    });

  } catch (err) {
    console.error('Upload resource error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Get resources for a section
export const getSectionResources = async (req, res) => {
  try {
    const { assignment_id } = req.query;

    if (!assignment_id) {
      return res.status(400).json({ error: 'assignment_id is required' });
    }

    const { data, error } = await supabase
      .from('resources')
      .select(`
        id,
        title,
        description,
        resource_type,
        resource_category,
        file_url,
        file_type,
        section,
        subject,
        uploaded_at,
        staff_subject_assignments (
          id,
          subjects ( name, code ),
          sections ( id, name ),
          staff ( name )
        )
      `)
      .eq('staff_subject_assignment_id', assignment_id)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);

  } catch (err) {
    console.error('Get resources error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Delete resource
export const deleteResource = async (req, res) => {
  try {
    const { id }    = req.params;
    const staffId   = req.profile.id;

    const { data: resource } = await supabase
      .from('resources')
      .select(`staff_subject_assignments ( staff_id )`)
      .eq('id', id)
      .single();

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.staff_subject_assignments.staff_id !== staffId) {
      return res.status(403).json({ error: 'You can only delete your own resources' });
    }

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Resource deleted successfully' });

  } catch (err) {
    console.error('Delete resource error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Get resources for student (by section + resource_type)
export const getStudentResources = async (req, res) => {
  try {
    const { section_id, file_type } = req.query;

    if (!section_id) return res.status(400).json({ error: 'section_id is required' });

    let query = supabase
      .from('resources')
      .select(`
        id, title, description, resource_type,
        file_url, file_type, section, subject, uploaded_at,
        staff_subject_assignments (
          subjects ( name, code ),
          sections ( id, name ),
          staff ( name )
        )
      `)
      .eq('staff_subject_assignments.sections.id', section_id)
      .order('uploaded_at', { ascending: false });

    if (file_type) query = query.eq('resource_type', file_type.toUpperCase());

    const { data, error } = await query;
    if (error) throw error;

    const filtered = data.filter(r => r.staff_subject_assignments !== null);
    return res.status(200).json(filtered);

  } catch (err) {
    console.error('Student resources error:', err);
    return res.status(500).json({ error: err.message });
  }
};