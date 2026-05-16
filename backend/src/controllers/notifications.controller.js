import supabase from '../config/supabase.js';

// Send notification (incharge only)
export const sendNotification = async (req, res) => {
  try {
    const { title, message } = req.body;
    const staffId = req.profile.id;

    // Get incharge section
    const { data: incharge, error: inchargeError } = await supabase
      .from('incharge_assignments')
      .select('section_id')
      .eq('staff_id', staffId)
      .single();

    if (inchargeError || !incharge) {
      return res.status(403).json({ error: 'You are not a class incharge' });
    }

    const sectionId = incharge.section_id;

    // Insert notification
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({ sender_id: staffId, section_id: sectionId, title, message })
      .select()
      .single();

    if (notifError) throw notifError;

    // Get all students in section
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('section_id', sectionId);

    if (studentsError) throw studentsError;

    // Bulk insert recipients
    const recipients = students.map(s => ({
      notification_id: notification.id,
      student_id: s.id,
      is_read: false
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipients);

    if (recipientsError) throw recipientsError;

    return res.status(201).json({
      message: 'Notification sent successfully',
      notification_id: notification.id,
      recipients_count: students.length
    });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to send notification' });
  }
};

// Get notifications for student
export const getStudentNotifications = async (req, res) => {
  try {
    const studentId = req.profile.id;

    const { data, error } = await supabase
      .from('notification_recipients')
      .select(`
        id, is_read, read_at,
        notifications (
          id, title, message, created_at,
          staff ( name )
        )
      `)
      .eq('student_id', studentId)
      .order('notifications(created_at)', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.profile.id;

    const { error } = await supabase
      .from('notification_recipients')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('notification_id', id)
      .eq('student_id', studentId);

    if (error) throw error;

    return res.status(200).json({ message: 'Marked as read' });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark as read' });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const studentId = req.profile.id;

    const { count, error } = await supabase
      .from('notification_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('is_read', false);

    if (error) throw error;

    return res.status(200).json({ count });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};