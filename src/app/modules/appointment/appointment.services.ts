import {
  Appointment,
  AppointmentStatus,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import prisma from '../../../shared/prisma';
import { IAuthUser, IGenericResponse } from '../../../interfaces/common';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IPaginationOptions } from '../../../interfaces/pagination';
import {
  appointmentRelationalFields,
  appointmentRelationalFieldsMapper,
  appointmentSearchableFields,
} from './appointment.constants';
import { generateTransactionId } from '../payment/payment.utils';
import { asyncForEach } from '../../../shared/utils';

const createAppointment = async (
  data: Partial<Appointment>,
  authUser: IAuthUser,
) => {
  const { doctorId, scheduleId } = data;
  const isDoctorExists = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
    },
  });

  if (!isDoctorExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Doctor doesn't exists!");
  }

  const isPatientExists = await prisma.patient.findFirst({
    where: {
      email: authUser?.email,
    },
  });

  if (!isPatientExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Patient doesn't exists!");
  }

  const isExistsDoctorSchedule = await prisma.doctorSchedule.findFirst({
    where: {
      doctorId: doctorId,
      scheduleId: scheduleId,
      isBooked: false,
    },
  });

  if (!isExistsDoctorSchedule) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Doctor Schedule is not available!',
    );
  }

  const videoCallingId: string = uuidv4();

  return await prisma.$transaction(async transactionClient => {
    const result = await transactionClient.appointment.create({
      data: {
        patientId: isPatientExists.id,
        doctorId: isDoctorExists.id,
        scheduleId: isExistsDoctorSchedule.scheduleId,
        videoCallingId,
      },
      include: {
        doctor: true,
        schedule: true,
      },
    });

    await transactionClient.doctorSchedule.updateMany({
      where: {
        doctorId: isDoctorExists.id,
        scheduleId: isExistsDoctorSchedule.scheduleId,
      },
      data: {
        isBooked: true,
        appointmentId: result.id,
      },
    });

    const transactionId: string = generateTransactionId(result.id);

    await transactionClient.payment.create({
      data: {
        appointmentId: result.id,
        amount: result.doctor.apointmentFee,
        transactionId,
      },
    });

    return result;
  });
};

const getMyAppointment = async (
  filters: any,
  options: IPaginationOptions,
  authUser: IAuthUser,
): Promise<IGenericResponse<Appointment[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const andConditions = [];

  if (authUser?.role === UserRole.PATIENT) {
    andConditions.push({
      patient: {
        email: authUser?.email,
      },
    });
  } else {
    andConditions.push({
      doctor: {
        email: authUser?.email,
      },
    });
  }

  if (Object.keys(filters).length > 0) {
    andConditions.push({
      AND: Object.keys(filters).map(key => ({
        [key]: {
          equals: (filters as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.AppointmentWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.appointment.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    include:
      authUser?.role === UserRole.PATIENT
        ? { doctor: true, schedule: true }
        : {
            patient: { include: { medicalReport: true, prescription: true } },
            schedule: true,
          },
  });
  const total = await prisma.appointment.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const getAllFromDB = async (
  filters: any,
  options: IPaginationOptions,
): Promise<IGenericResponse<Appointment[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;
  const andConditions = [];

  // if (searchTerm) {
  //     andConditions.push({
  //         OR: appointmentSearchableFields.map(field => ({
  //             [field]: {
  //                 contains: searchTerm,
  //                 mode: 'insensitive',
  //             },
  //         })),
  //     });
  // }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => {
        if (appointmentRelationalFields.includes(key)) {
          return {
            [appointmentRelationalFieldsMapper[key]]: {
              email: (filterData as any)[key],
            },
          };
        } else {
          return {
            [key]: {
              equals: (filterData as any)[key],
            },
          };
        }
      }),
    });
  }

  // console.dir(andConditions, { depth: Infinity })
  const whereConditions: Prisma.AppointmentWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.appointment.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    include: {
      doctor: true,
      patient: true,
    },
  });
  const total = await prisma.appointment.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const cancelUnpaidAppointments = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const unpaidAppointments = await prisma.appointment.findMany({
    where: {
      paymentStatus: PaymentStatus.UNPAID,
      createdAt: {
        lte: thirtyMinutesAgo,
      },
    },
  });

  const appointmentIdsToCancel = unpaidAppointments.map(
    appointment => appointment.id,
  );
  //const scheduleIdsToCancel = uppaidAppointments.map(appointment => appointment.scheduleId);

  await prisma.$transaction(async transactionClient => {
    await transactionClient.payment.deleteMany({
      where: {
        appointmentId: {
          in: appointmentIdsToCancel,
        },
      },
    });

    await transactionClient.appointment.deleteMany({
      where: {
        id: {
          in: appointmentIdsToCancel,
        },
      },
    });

    await asyncForEach(unpaidAppointments, async (appointment: any) => {
      await transactionClient.doctorSchedule.updateMany({
        where: {
          AND: [
            {
              doctorId: appointment.doctorId,
            },
            {
              scheduleId: appointment.scheduleId,
            },
          ],
        },
        data: {
          isBooked: false,
        },
      });
    });
  });
};

const changeAppointmentStatus = async (
  appointmentId: string,
  status: AppointmentStatus,
  user: any,
) => {
  const isDoctorsAppointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      paymentStatus: PaymentStatus.PAID,
    },
    include: {
      doctor: true,
    },
  });

  if (!isDoctorsAppointment) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Appointment not found!');
  }

  if (user.role === UserRole.DOCTOR) {
    if (!(user.email === isDoctorsAppointment?.doctor.email)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'This is not your appointment!',
      );
    }
  }

  const result = await prisma.appointment.update({
    where: {
      id: appointmentId,
    },
    data: {
      status,
    },
  });
  return result;
};

export const AppointmentServices = {
  createAppointment,
  getMyAppointment,
  getAllFromDB,
  cancelUnpaidAppointments,
  changeAppointmentStatus,
};
