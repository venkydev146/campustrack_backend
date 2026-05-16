import supabase from '../config/supabase.js';

// Upload resource
export const uploadResource = async (req, res) => {
  try {
    const { assignment_id, title, description, resource_type, url } = req.body;

    if (!assignment_id || !title || !resource_type || !url) {
      return res.status(400).json({ error: 'assignment_id, title, resource_type and url are required' });
    }

    const { data, error } = await supabase
      .from('resources')
      .insert({
        staff_subject_assignment_id: assignment_id,
        title,
        description,
        resource_type,
        url
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
        url,
        uploaded_at,
        staff_subject_assignments (
          subjects ( name, code ),
          sections ( name ),
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
    const { id } = req.params;
    const staffId = req.profile.id;

    // Check if resource belongs to this staff
    const { data: resource } = await supabase
      .from('resources')
      .select(`
        id,
        staff_subject_assignments ( staff_id )
      `)
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