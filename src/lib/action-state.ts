/** Estado de retorno das server actions — seguro para client e server. */
export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialActionState: ActionState = { ok: false };
