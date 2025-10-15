import api from '../../api/client';

export async function getEnrolledCourses() {
  const res = await api.get('/student/courses');
  return res.data;
}

export async function addUserCourse(offeringId : number) {
  const res = await api.post('/student/enroll',offeringId);
  return res.data;
}


