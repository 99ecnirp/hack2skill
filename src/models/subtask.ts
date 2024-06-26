import mongoose, { ObjectId } from "mongoose";
import userModel from "./user";
import { ERROR_MESSAGES, SUCCESS } from "../utils/constants";
import { ICommonReturn } from "../utils/interfaces";

// getting all subtasks, needDeletedSubtasks is flag which represents 
// whether we want all the subtasks or only which are not marked for deleteion
const getAllSubTasks = async (
  email: string,
  taskId: string,
  needDeletedSubtasks: boolean
): Promise<ICommonReturn> => {
  try {
    let _id;
    try {
      _id = new mongoose.Types.ObjectId(taskId);
    } catch (error) {
      return {
        error: true,
        message: ERROR_MESSAGES.TASKS.NOT_FOUND(taskId),
        status: 400,
        data: {},
      };
    }
    let subtasks;
    if (needDeletedSubtasks) {
      subtasks = "$tasks.subtasks";
    } else {
      subtasks = {
        $filter: {
          input: "$tasks.subtasks",
          as: "subtask",
          cond: {
            $not: { $ifNull: ["$$subtask.deletedAt", needDeletedSubtasks] },
          },
        },
      };
    }
    const result = await userModel.aggregate([
      {
        $match: {
          email,
        },
      },
      {
        $unwind: "$tasks",
      },
      {
        $match: {
          "tasks._id": _id,
        },
      },
      {
        $project: {
          _id: 0,
          tasks: {
            $cond: {
              if: { $not: { $ifNull: ["$tasks.deletedAt", false] } },
              then: {
                status: "$tasks.status",
                subject: "$tasks.subject",
                deadline: "$tasks.deadline",
                _id: "$tasks._id",
                subtasks,
              },
              else: "$$REMOVE",
            },
          },
        },
      },
    ]);
    if (!Array.isArray(result)) {
      return {
        error: true,
        message: ERROR_MESSAGES.SUBTASKS.FETCH,
        data: {},
      };
    } else if (result.length === 0) {
      return {
        error: true,
        message: ERROR_MESSAGES.TASKS.NOT_FOUND(taskId),
        status: 400,
        data: {},
      };
    } else {
      return {
        error: false,
        message: SUCCESS,
        data: result[0].tasks.subtasks,
      };
    }
  } catch (error) {
    return {
      error: true,
      message: ERROR_MESSAGES.SUBTASKS.FETCH,
      data: error,
    };
  }
};

const updateSubtaskById = async (
  email: string,
  id: string,
  updateSubtaskData: object[]
) => {
  try {
    let _id;
    try {
      _id = new mongoose.Types.ObjectId(id);
    } catch (error) {
      return {
        error: true,
        message: ERROR_MESSAGES.TASKS.NOT_FOUND(id),
        status: 400,
        data: {},
      };
    }
    const result = await userModel.updateOne(
      {
        email,
        tasks: {
          $elemMatch: {
            _id,
            deletedAt: { $exists: false },
          },
        },
      },
      {
        $set: {
          "tasks.$.subtasks": updateSubtaskData,
        },
      }
    );
    if (!result || !result.acknowledged) {
      return {
        error: true,
        message: ERROR_MESSAGES.SUBTASKS.UPDATE,
        data: {},
      };
    } else {
      return {
        error: false,
        message: SUCCESS,
        data: result,
      };
    }
  } catch (error) {
    return {
      error: true,
      message: ERROR_MESSAGES.SUBTASKS.UPDATE,
      data: error,
    };
  }
};

export { getAllSubTasks, updateSubtaskById };
