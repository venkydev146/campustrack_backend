import supabase from '../config/supabase.js';

const DAYS = {
  0: null,  // Sunday - no classes
  1: 1,     // Monday
  2: 2,     // Tuesday
  3: 3,     // Wednesday
  4: 4,     // Thursday
  5: 5,     // Friday
  6: 6      // Saturday
};

const DAY_NAMES = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

// GET today's timetable
export const getTodayTimetable = async (req, res) => {
  try {
    const staffId = req.profile.id;
    const todayDay = DAYS[new Date().getDay()];

    if (!todayDay) {
      return res.status(200).json({ message: 'No classes on Sunday', classes: [] });
    }

    const { data, error } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        day_of_week,
        is_active,
        time_slots (
          id, period_number, start_time, end_time, label
        ),
        staff_subject_assignments (
          id,
          subjects ( id, name, code ),
          sections ( id, name )
        )
      `)
      .eq('day_of_week', todayDay)
      .eq('is_active', true)
      .eq('staff_subject_assignments.staff_id', staffId)
      .order('time_slots(period_number)', { ascending: true });

    if (error) throw error;

    // Filter out nulls (supabase returns all if join doesn't match)
    const filtered = data.filter(
      entry => entry.staff_subject_assignments !== null
    );

    const classes = filtered.map(entry => ({
      timetable_entry_id: entry.id,
      period_number: entry.time_slots.period_number,
      start_time: entry.time_slots.start_time,
      end_time: entry.time_slots.end_time,
      label: entry.time_slots.label,
      subject_id: entry.staff_subject_assignments.subjects.id,
      subject_name: entry.staff_subject_assignments.subjects.name,
      subject_code: entry.staff_subject_assignments.subjects.code,
      section_id: entry.staff_subject_assignments.sections.id,
      section_name: entry.staff_subject_assignments.sections.name,
      assignment_id: entry.staff_subject_assignments.id
    }));

    return res.status(200).json({ day: DAY_NAMES[todayDay], classes });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch timetable' });
  }
};

// GET full week timetable
export const getWeekTimetable = async (req, res) => {
  try {
    const staffId = req.profile.id;

    const { data, error } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        day_of_week,
        time_slots (
          period_number, start_time, end_time, label
        ),
        staff_subject_assignments (
          id,
          subjects ( name, code ),
          sections ( name )
        )
      `)
      .eq('is_active', true)
      .eq('staff_subject_assignments.staff_id', staffId)
      .order('day_of_week')
      .order('time_slots(period_number)');

    if (error) throw error;

    // Group by day
    const week = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [] };

    data
      .filter(entry => entry.staff_subject_assignments !== null)
      .forEach(entry => {
        const dayName = DAY_NAMES[entry.day_of_week];
        if (dayName) {
          week[dayName].push({
            timetable_entry_id: entry.id,
            period_number: entry.time_slots.period_number,
            start_time: entry.time_slots.start_time,
            end_time: entry.time_slots.end_time,
            label: entry.time_slots.label,
            subject_name: entry.staff_subject_assignments.subjects.name,
            subject_code: entry.staff_subject_assignments.subjects.code,
            section_name: entry.staff_subject_assignments.sections.name,
            assignment_id: entry.staff_subject_assignments.id
          });
        }
      });

    return res.status(200).json(week);

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch week timetable' });
  }
};
export const getTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        staff_subject_assignments (
          sections ( id, name )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new Error('Entry not found');

    return res.status(200).json({
      section_id:   data.staff_subject_assignments.sections.id,
      section_name: data.staff_subject_assignments.sections.name
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};