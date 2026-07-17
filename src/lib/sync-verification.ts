export interface ServerRecord {
  id: string;
}

export interface ServerRecordGateway<TDraft, TRecord extends ServerRecord> {
  create: (draft: TDraft) => Promise<TRecord>;
  listFromServer: () => Promise<TRecord[]>;
}

export interface VerifiedServerWrite<TRecord extends ServerRecord> {
  created: TRecord;
  serverRecords: TRecord[];
}

export async function createAndVerifyServerRecord<TDraft, TRecord extends ServerRecord>(
  draft: TDraft,
  gateway: ServerRecordGateway<TDraft, TRecord>,
): Promise<VerifiedServerWrite<TRecord>> {
  const created = await gateway.create(draft);
  const serverRecords = await gateway.listFromServer();

  if (!serverRecords.some((record) => record.id === created.id)) {
    throw new Error("O registro foi criado, mas ainda não apareceu na releitura do servidor.");
  }

  return { created, serverRecords };
}
