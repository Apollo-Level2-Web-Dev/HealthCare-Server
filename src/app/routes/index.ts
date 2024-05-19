import express from 'express';
import { DoctorRoutes } from '../modules/doctor/doctor.route';
import { SpecialtiesRoutes } from '../modules/specialties/specialties.route';
import { userRoutes } from '../modules/user/user.route';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { PatientRoutes } from '../modules/patient/patient.route';
import { AdminRoutes } from '../modules/admin/admin.route';
import { AppointmentRoutes } from '../modules/appointment/appointment.routes';
import { ScheduleRoutes } from '../modules/schedule/schedule.route';
import { DoctorScheduleRoutes } from '../modules/doctorSchedule/doctorSchedule.route';
import { paymentRoutes } from '../modules/payment/payment.routes';
import { PrescriptionsRoutes } from '../modules/prescription/prescription.route';
import { ReviewRoutes } from '../modules/review/review.route';
import { MetaRoutes } from '../modules/meta/meta.routes';
import { MeilisearchRoutes } from '../modules/meilisearch/meilisearch.route';

const router = express.Router();

const moduleRoutes = [
  // ... routes
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/user',
    route: userRoutes,
  },
  {
    path: '/doctor',
    route: DoctorRoutes,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/patient',
    route: PatientRoutes,
  },
  {
    path: '/specialties',
    route: SpecialtiesRoutes,
  },
  {
    path: '/appointment',
    route: AppointmentRoutes,
  },
  {
    path: '/schedule',
    route: ScheduleRoutes,
  },
  {
    path: '/doctor-schedule',
    route: DoctorScheduleRoutes,
  },
  {
    path: '/payment',
    route: paymentRoutes,
  },
  {
    path: '/prescription',
    route: PrescriptionsRoutes,
  },
  {
    path: '/review',
    route: ReviewRoutes,
  },
  {
    path: '/metadata',
    route: MetaRoutes,
  },
  {
    path: '/search-doctors',
    route: MeilisearchRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
