import supabase from '../config/supabase.js';

// Staff Login
export const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Supabase auth login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch staff profile
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select(`
        *,
        departments (
          id, name, code
        )
      `)
      .eq('user_id', authData.user.id)
      .single();

    if (staffError || !staffData) {
      return res.status(403).json({ error: 'Staff profile not found' });
    }

    return res.status(200).json({
      token: authData.session.access_token,
      profile: staffData,
      role: 'staff'
    });

  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
};

// Student Login
export const studentLogin = async (req, res) => {
  try {
       console.log('Student login body:', req.body);
    const { regNo, password } = req.body;

    if (!regNo || !password) {
      return res.status(400).json({ error: 'Register number and password required' });
    }

    // Find student by reg_no to get their email
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('email')
      .eq('reg_no', regNo)
      .single();

    if (studentError || !studentData) {
      return res.status(401).json({ error: 'Invalid register number or password' });
    }

    // Login with email + password via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email:    studentData.email,
      password: password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid register number or password' });
    }

    // Fetch full student profile
    const { data: profile, error: profileError } = await supabase
      .from('students')
      .select(`
        *,
        sections (
          id, name, semester,
          branches (
            id, name,
            departments (
              id, name, code
            )
          )
        )
      `)
      .eq('user_id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    return res.status(200).json({
      token:   authData.session.access_token,
      profile: profile,
      role:    'student'
    });

  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    await supabase.auth.signOut();
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Logout failed' });
  }
};

// Get current user profile
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      role: req.role,
      profile: req.profile
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};