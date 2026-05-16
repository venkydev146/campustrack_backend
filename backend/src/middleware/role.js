import supabase from '../config/supabase.js';

// Attach full profile (staff or student) to req
export const attachProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check staff first
    const { data: staffData } = await supabase
      .from('staff')
      .select('*, departments(name, code)')
      .eq('user_id', userId)
      .single();

    if (staffData) {
      req.profile = staffData;
      req.role = 'staff';
      return next();
    }

    // Check student
    const { data: studentData } = await supabase
      .from('students')
      .select('*, sections(name, branches(name, departments(name)))')
      .eq('user_id', userId)
      .single();

    if (studentData) {
      req.profile = studentData;
      req.role = 'student';
      return next();
    }

    return res.status(403).json({ error: 'Profile not found' });

  } catch (err) {
    return res.status(500).json({ error: 'Profile resolution error' });
  }
};

// Only staff can access
export const requireStaff = (req, res, next) => {
  if (req.role !== 'staff') {
    return res.status(403).json({ error: 'Staff access only' });
  }
  next();
};

// Only students can access
export const requireStudent = (req, res, next) => {
  if (req.role !== 'student') {
    return res.status(403).json({ error: 'Student access only' });
  }
  next();
};

// Only HOD can access
export const requireHOD = (req, res, next) => {
  if (req.role !== 'staff' || req.profile.role !== 'hod') {
    return res.status(403).json({ error: 'HOD access only' });
  }
  next();
};

// Only incharge can send notifications
export const requireIncharge = async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('incharge_assignments')
      .select('id')
      .eq('staff_id', req.profile.id)
      .single();

    if (!data) {
      return res.status(403).json({ error: 'Class incharge access only' });
    }

    req.inchargeAssignment = data;
    next();

  } catch (err) {
    return res.status(403).json({ error: 'Not a class incharge' });
  }
};