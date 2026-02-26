import { departmentHandlers } from "./departments";
import { machineHandlers } from "./machines";
import { employeeHandlers } from "./employees";
import { workOrderHandlers } from "./workOrders";
import { operationHandlers } from "./operations";
import { questionnaireHandlers } from "./questionnaire";

export const handlers = [
  ...departmentHandlers,
  ...machineHandlers,
  ...employeeHandlers,
  ...workOrderHandlers,
  ...operationHandlers,
  ...questionnaireHandlers,
];
