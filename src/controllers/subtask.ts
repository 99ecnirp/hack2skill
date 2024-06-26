import { Date } from "mongoose";
import { Request, Response } from "express";
import { getEmailFromHeader } from "../utils/helper";
import { ERROR_MESSAGES, SUCCESS } from "../utils/constants";
import { getAllSubTasks, updateSubtaskById } from "../models/subtask";

const get = async (req: Request, res: Response) => {
  try {
    const email = getEmailFromHeader(req);
    const taskId = req.params.id;

    if(!taskId){
      return res.status(400).json({
        error: true,
        message: ERROR_MESSAGES.ID_NOT_PRESENT,
        data: {},
      });
    }

    //getting all subtasks
    const {
      error: getAllSubTasksError,
      message: getAllSubTasksMessage,
      status: getAllSubTasksStatus,
      data: getAllSubtasksData,
    } = await getAllSubTasks(email, taskId, false);

    if (getAllSubTasksError) {
      console.error(getAllSubTasksMessage)
      return res.status(getAllSubTasksStatus ?? 500).json({
        error: true,
        message: getAllSubTasksMessage,
        data: {},
      });
    }

    return res.status(200).json({
      error: false,
      message: SUCCESS,
      data: getAllSubtasksData,
    });
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: true,
      message: ERROR_MESSAGES.INTERNAL_SERVER,
      data: {},
    });
  }
};

const update = async (req: Request, res: Response) => {
  const taskId = req.params.id;
  const email = getEmailFromHeader(req);

  if(!taskId){
    return res.status(400).json({
      error: true,
      message: ERROR_MESSAGES.ID_NOT_PRESENT,
      data: {},
    });
  }

  const newSubtasks: { subject: string; status: string; deadline: Date }[] =
    req.body;
  
  const {
    error: getAllSubTasksError,
    message: getAllSubTasksMessage,
    status: getAllSubTasksStatus,
    data: getAllSubtasksData,
  } = await getAllSubTasks(email, taskId, true);

  if (getAllSubTasksError) {
    console.error(getAllSubTasksMessage)
    return res.status(getAllSubTasksStatus ?? 500).json({
      error: true,
      message: getAllSubTasksMessage,
      data: {},
    });
  }

  //making a map of new subtasks, subject -> subtask
  const newSubtasksMap = new Map();
  for (let idx in newSubtasks) {
    const subtask = newSubtasks[idx];
    const { subject } = subtask;
    newSubtasksMap.set(subject, subtask);
  }

  //if any subtask in incoming request have same subject, that will be updated.
  for (let idx in getAllSubtasksData) {
    const { subject, deletedAt } = getAllSubtasksData[idx];
    if (deletedAt) {
      continue;
    } else if (!newSubtasksMap.has(subject)) {
      //if any previou subtask not present in incoming request, it will be marked deleted
      getAllSubtasksData[idx]["deletedAt"] = new Date();
    } else {
      getAllSubtasksData[idx] = structuredClone(newSubtasksMap.get(subject));
      newSubtasksMap.delete(subject);
    }
  }
  
  for (let [key, value] of newSubtasksMap) {
    getAllSubtasksData.push(value);
  }

  //updating the subtasks
  const { error: updateSubtaskByIdError, message: updateSubtaskByIdMessage } =
    await updateSubtaskById(email, taskId, getAllSubtasksData);

  if (updateSubtaskByIdError) {
    console.error(updateSubtaskByIdMessage)
    return res.status(500).json({
      error: true,
      message: ERROR_MESSAGES.INTERNAL_SERVER,
      data: {},
    });
  }
  return await get(req, res);
};

export default { get, update };
