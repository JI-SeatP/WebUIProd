import { departmentHandlers } from "./departments";
import { machineHandlers } from "./machines";
import { employeeHandlers } from "./employees";
import { workOrderHandlers } from "./workOrders";
import { operationHandlers } from "./operations";
import { questionnaireHandlers } from "./questionnaire";
import { timeTrackingHandlers } from "./timeTracking";
import { correctionsHandlers } from "./corrections";
import { inventoryHandlers } from "./inventory";
import { modalsHandlers } from "./modals";

export const handlers = [
  ...departmentHandlers,
  ...machineHandlers,
  ...employeeHandlers,
  ...workOrderHandlers,
  ...operationHandlers,
  ...questionnaireHandlers,
  ...timeTrackingHandlers,
  ...correctionsHandlers,
  ...inventoryHandlers,
  ...modalsHandlers,
];
