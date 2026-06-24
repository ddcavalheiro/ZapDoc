/**
 * Mock encadeável do client Drizzle para testes de Server Actions.
 *
 * O Drizzle expõe um builder fluente cujas cadeias terminam em pontos
 * diferentes e são aguardadas (`await`), por exemplo:
 *   await db.insert(t).values(v).returning({ id })   // resolve um array
 *   await db.update(t).set(v).where(c)                // resolve void
 *   await db.select(c).from(t).where(c).limit(1)      // resolve um array
 *
 * Este helper devolve um Proxy onde:
 *  - qualquer método retorna o próprio builder (permite encadear);
 *  - cada chamada é registrada em `calls` (método + argumentos);
 *  - `await` em qualquer ponto consome o próximo valor de `queue` (FIFO);
 *    quando a fila está vazia, resolve `undefined`.
 *
 * Como construir o mock dentro de `vi.hoisted` (os factories de `vi.mock`
 * são içados acima dos imports), este arquivo expõe a fábrica como string
 * reutilizável seria frágil — por isso a fábrica é simples o bastante para
 * ser duplicada inline. Mantemos aqui apenas os tipos para documentação.
 */
export type DbCall = { method: string; args: unknown[] };

export type DbMock = {
  db: unknown;
  calls: DbCall[];
  queue: unknown[];
  /** Enfileira valores que serão resolvidos pelos próximos `await`, em ordem. */
  enqueue: (...values: unknown[]) => void;
  /** Limpa chamadas e fila (usar no beforeEach). */
  reset: () => void;
  /** Args da última chamada de um método (ex.: "values", "set", "where"). */
  lastArgs: (method: string) => unknown[] | undefined;
  /** Args da i-ésima chamada (0-based) de um método. */
  argsOf: (method: string, index?: number) => unknown[] | undefined;
};
