import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  atualizarAlunoFirebase,
  atualizarTurmaFirebase,
  criarAlunoFirebase,
  criarAlunosFirebase,
  criarTurmaFirebase,
  excluirAlunoFirebase,
  excluirTurmaFirebase,
} from "@/integrations/firebase/academic-data";
import { listAlunosByTurma, listTurmas, type Aluno, type Turma } from "@/lib/domain";
import { parseStudentCsvFile, validateStudentFields } from "@/lib/student-import";

import { mobileQueryKeys } from "./mobile-query-keys";
import {
  MobileCard,
  MobileCardHeader,
  MobileEmpty,
  MobileError,
  MobileField,
  MobileLoading,
  MobilePage,
} from "./mobile-ui";
import { errorMessage, parseOptionalInteger } from "./mobile-utils";

export function MobileClassesScreen({ connected }: { connected: boolean }) {
  const queryClient = useQueryClient();
  const classesQuery = useQuery({
    queryKey: mobileQueryKeys.classes,
    queryFn: listTurmas,
    enabled: connected,
  });
  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const selected = classes.find((item) => item.id === selectedId) ?? classes[0] ?? null;

  useEffect(() => {
    if (selectedId && !classes.some((item) => item.id === selectedId)) setSelectedId(null);
  }, [classes, selectedId]);

  return (
    <MobilePage
      title="Turmas e alunos"
      description="Cadastros em cartões, próprios para toque e telas estreitas."
      action={
        <Button type="button" disabled={!connected} onClick={() => setCreating((value) => !value)}>
          {creating ? <X /> : <Plus />}
          {creating ? "Fechar" : "Nova"}
        </Button>
      }
    >
      {creating && (
        <NewClassForm
          connected={connected}
          onCreated={(classId) => {
            setSelectedId(classId);
            setCreating(false);
          }}
        />
      )}

      {!connected ? (
        <MobileEmpty>Reconecte-se para carregar turmas e alunos.</MobileEmpty>
      ) : classesQuery.isPending ? (
        <MobileLoading label="Carregando turmas…" />
      ) : classesQuery.isError ? (
        <MobileError error={classesQuery.error} onRetry={() => void classesQuery.refetch()} />
      ) : classes.length === 0 ? (
        <MobileEmpty>
          <Users />
          <p>Nenhuma turma cadastrada.</p>
          <Button type="button" onClick={() => setCreating(true)}>
            Criar a primeira turma
          </Button>
        </MobileEmpty>
      ) : (
        <>
          <div className="mobile-horizontal-picker" role="list" aria-label="Turmas">
            {classes.map((item) => (
              <button
                type="button"
                role="listitem"
                key={item.id}
                className={selected?.id === item.id ? "is-active" : ""}
                onClick={() => setSelectedId(item.id)}
              >
                <strong>{item.nome}</strong>
                <span>{[item.serie, item.ano].filter(Boolean).join(" · ") || "Sem série"}</span>
              </button>
            ))}
          </div>
          {selected && (
            <ClassWorkspace key={selected.id} classRecord={selected} connected={connected} />
          )}
        </>
      )}
    </MobilePage>
  );
}

function NewClassForm({
  connected,
  onCreated,
}: {
  connected: boolean;
  onCreated: (classId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const create = useMutation({
    mutationFn: () => {
      const parsedYear = parseClassYear(year);
      return criarTurmaFirebase({ nome: name, serie: grade || null, ano: parsedYear });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.classes });
      toast.success("Turma criada no mesmo Firebase.");
      onCreated(created.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <MobileCard>
      <MobileCardHeader
        title="Nova turma"
        description="Os dados aparecerão também na versão web."
      />
      <form
        className="mobile-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (connected) create.mutate();
        }}
      >
        <MobileField label="Nome *" htmlFor="new-class-name">
          <Input
            id="new-class-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: 2ª série A"
            required
          />
        </MobileField>
        <div className="mobile-form-grid">
          <MobileField label="Série" htmlFor="new-class-grade">
            <Input
              id="new-class-grade"
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder="Ensino Médio"
            />
          </MobileField>
          <MobileField label="Ano" htmlFor="new-class-year">
            <Input
              id="new-class-year"
              type="number"
              inputMode="numeric"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </MobileField>
        </div>
        <Button type="submit" disabled={!connected || !name.trim() || create.isPending}>
          {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Criar turma
        </Button>
      </form>
    </MobileCard>
  );
}

function ClassWorkspace({ classRecord, connected }: { classRecord: Turma; connected: boolean }) {
  const queryClient = useQueryClient();
  const [editingClass, setEditingClass] = useState(false);
  const [name, setName] = useState(classRecord.nome);
  const [grade, setGrade] = useState(classRecord.serie ?? "");
  const [year, setYear] = useState(classRecord.ano ? String(classRecord.ano) : "");

  const studentsQuery = useQuery({
    queryKey: mobileQueryKeys.students(classRecord.id),
    queryFn: () => listAlunosByTurma(classRecord.id),
    enabled: connected,
  });

  const updateClass = useMutation({
    mutationFn: () =>
      atualizarTurmaFirebase({
        id: classRecord.id,
        nome: name,
        serie: grade || null,
        ano: parseClassYear(year),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.classes }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.assessments }),
      ]);
      setEditingClass(false);
      toast.success("Turma atualizada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeClass = useMutation({
    mutationFn: excluirTurmaFirebase,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: mobileQueryKeys.students(classRecord.id) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.classes }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.assessments }),
      ]);
      toast.success("Turma e vínculos relacionados apagados.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function deleteClass() {
    if (
      window.confirm(
        `Apagar a turma “${classRecord.nome}”, seus alunos e os vínculos relacionados? Esta ação não pode ser desfeita.`,
      )
    ) {
      removeClass.mutate(classRecord.id);
    }
  }

  return (
    <div className="mobile-stack">
      <MobileCard>
        <MobileCardHeader
          title={classRecord.nome}
          description={
            [classRecord.serie, classRecord.ano].filter(Boolean).join(" · ") || "Sem série e ano"
          }
          action={
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingClass((value) => !value)}
            >
              <Pencil /> Editar
            </Button>
          }
        />
        {editingClass && (
          <form
            className="mobile-form mobile-card-inset"
            onSubmit={(event) => {
              event.preventDefault();
              updateClass.mutate();
            }}
          >
            <MobileField label="Nome" htmlFor={`class-name-${classRecord.id}`}>
              <Input
                id={`class-name-${classRecord.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </MobileField>
            <div className="mobile-form-grid">
              <MobileField label="Série" htmlFor={`class-grade-${classRecord.id}`}>
                <Input
                  id={`class-grade-${classRecord.id}`}
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                />
              </MobileField>
              <MobileField label="Ano" htmlFor={`class-year-${classRecord.id}`}>
                <Input
                  id={`class-year-${classRecord.id}`}
                  type="number"
                  inputMode="numeric"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                />
              </MobileField>
            </div>
            <div className="mobile-form-actions">
              <Button type="button" variant="ghost" onClick={() => setEditingClass(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!connected || !name.trim() || updateClass.isPending}>
                {updateClass.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                Salvar
              </Button>
            </div>
          </form>
        )}
        <Button
          type="button"
          variant="ghost"
          className="mobile-danger-action"
          disabled={!connected || removeClass.isPending}
          onClick={deleteClass}
        >
          {removeClass.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
          Apagar turma e dados vinculados
        </Button>
      </MobileCard>

      <StudentsWorkspace
        classId={classRecord.id}
        students={studentsQuery.data ?? []}
        loading={studentsQuery.isPending}
        error={studentsQuery.error}
        connected={connected}
        onRetry={() => void studentsQuery.refetch()}
      />
    </div>
  );
}

function StudentsWorkspace({
  classId,
  students,
  loading,
  error,
  connected,
  onRetry,
}: {
  classId: string;
  students: Aluno[];
  loading: boolean;
  error: Error | null;
  connected: boolean;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [name, setName] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [email, setEmail] = useState("");
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: mobileQueryKeys.students(classId) });

  const createStudent = useMutation({
    mutationFn: () => {
      validateStudentFields({ nome: name, matricula: enrollment, email });
      return criarAlunoFirebase({
        turmaId: classId,
        nome: name,
        matricula: enrollment || null,
        email: email || null,
      });
    },
    onSuccess: async () => {
      setName("");
      setEnrollment("");
      setEmail("");
      setShowNewStudent(false);
      await refresh();
      toast.success("Aluno adicionado.");
    },
    onError: (nextError: Error) => toast.error(nextError.message),
  });

  const removeStudent = useMutation({
    mutationFn: excluirAlunoFirebase,
    onSuccess: async () => {
      await refresh();
      toast.success("Aluno e vínculos relacionados apagados.");
    },
    onError: (nextError: Error) => toast.error(nextError.message),
  });

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const rows = await parseStudentCsvFile(file, classId);
      await criarAlunosFirebase(rows);
      await refresh();
      toast.success(
        `${rows.length} aluno${rows.length === 1 ? "" : "s"} importado${rows.length === 1 ? "" : "s"}.`,
      );
    } catch (nextError) {
      toast.error(errorMessage(nextError));
    } finally {
      setImporting(false);
    }
  }

  function deleteStudent(student: Aluno) {
    if (window.confirm(`Apagar o aluno “${student.nome}” e suas respostas vinculadas?`)) {
      removeStudent.mutate(student.id);
    }
  }

  return (
    <MobileCard>
      <MobileCardHeader
        title={`Alunos (${students.length})`}
        description="Cadastre individualmente ou importe um CSV comum."
        action={
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowNewStudent((value) => !value)}
          >
            <UserPlus /> Adicionar
          </Button>
        }
      />

      <label className="mobile-file-button">
        {importing ? <Loader2 className="animate-spin" /> : <Upload />}
        {importing ? "Importando…" : "Importar CSV"}
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={!connected || importing}
          onChange={(event) => void importCsv(event)}
        />
      </label>

      {showNewStudent && (
        <form
          className="mobile-form mobile-card-inset"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            createStudent.mutate();
          }}
        >
          <MobileField label="Nome *" htmlFor={`student-name-${classId}`}>
            <Input
              id={`student-name-${classId}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </MobileField>
          <MobileField label="Matrícula" htmlFor={`student-enrollment-${classId}`}>
            <Input
              id={`student-enrollment-${classId}`}
              inputMode="numeric"
              pattern="[0-9]*"
              value={enrollment}
              onChange={(event) => setEnrollment(event.target.value.replace(/\D/g, ""))}
            />
          </MobileField>
          <MobileField label="E-mail" htmlFor={`student-email-${classId}`}>
            <Input
              id={`student-email-${classId}`}
              type="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </MobileField>
          <Button type="submit" disabled={!connected || !name.trim() || createStudent.isPending}>
            {createStudent.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Salvar aluno
          </Button>
        </form>
      )}

      {loading ? (
        <MobileLoading label="Carregando alunos…" />
      ) : error ? (
        <MobileError error={error} onRetry={onRetry} />
      ) : students.length === 0 ? (
        <MobileEmpty>Nenhum aluno nesta turma.</MobileEmpty>
      ) : (
        <div className="mobile-card-list">
          {students.map((student) => (
            <article key={student.id} className="mobile-student-card">
              <button
                type="button"
                className="mobile-student-summary"
                onClick={() => setEditingId(editingId === student.id ? null : student.id)}
              >
                <div>
                  <strong>{student.nome}</strong>
                  <p>
                    {student.matricula ? `Matrícula ${student.matricula}` : "Sem matrícula"}
                    {student.email ? ` · ${student.email}` : " · sem e-mail"}
                  </p>
                </div>
                {editingId === student.id ? <ChevronUp /> : <ChevronDown />}
              </button>
              {editingId === student.id && (
                <StudentEditor
                  student={student}
                  connected={connected}
                  onSaved={async () => {
                    await refresh();
                    setEditingId(null);
                  }}
                  onDelete={() => deleteStudent(student)}
                  deleting={removeStudent.isPending && removeStudent.variables === student.id}
                />
              )}
            </article>
          ))}
        </div>
      )}
    </MobileCard>
  );
}

function StudentEditor({
  student,
  connected,
  onSaved,
  onDelete,
  deleting,
}: {
  student: Aluno;
  connected: boolean;
  onSaved: () => Promise<void>;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [name, setName] = useState(student.nome);
  const [enrollment, setEnrollment] = useState(student.matricula ?? "");
  const [email, setEmail] = useState(student.email ?? "");
  const [rollCall, setRollCall] = useState(student.chamada ? String(student.chamada) : "");

  const update = useMutation({
    mutationFn: () => {
      validateStudentFields({ nome: name, matricula: enrollment, email });
      return atualizarAlunoFirebase({
        id: student.id,
        turmaId: student.turma_id,
        nome: name,
        matricula: enrollment || null,
        email: email || null,
        chamada: rollCall ? parseOptionalInteger(rollCall) : null,
      });
    },
    onSuccess: async () => {
      await onSaved();
      toast.success("Aluno atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form
      className="mobile-form mobile-student-editor"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate();
      }}
    >
      <MobileField label="Nome" htmlFor={`edit-student-name-${student.id}`}>
        <Input
          id={`edit-student-name-${student.id}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </MobileField>
      <div className="mobile-form-grid">
        <MobileField label="Matrícula" htmlFor={`edit-student-enrollment-${student.id}`}>
          <Input
            id={`edit-student-enrollment-${student.id}`}
            inputMode="numeric"
            value={enrollment}
            onChange={(event) => setEnrollment(event.target.value.replace(/\D/g, ""))}
          />
        </MobileField>
        <MobileField label="Chamada" htmlFor={`edit-student-roll-${student.id}`}>
          <Input
            id={`edit-student-roll-${student.id}`}
            inputMode="numeric"
            value={rollCall}
            onChange={(event) => setRollCall(event.target.value.replace(/\D/g, ""))}
          />
        </MobileField>
      </div>
      <MobileField label="E-mail" htmlFor={`edit-student-email-${student.id}`}>
        <Input
          id={`edit-student-email-${student.id}`}
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </MobileField>
      <div className="mobile-form-actions">
        <Button
          type="button"
          variant="ghost"
          className="text-destructive"
          disabled={!connected || deleting}
          onClick={onDelete}
        >
          {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          Apagar
        </Button>
        <Button type="submit" disabled={!connected || !name.trim() || update.isPending}>
          {update.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

function parseClassYear(value: string): number | null {
  const year = parseOptionalInteger(value);
  if (year !== null && (year < 1900 || year > 2200)) {
    throw new Error("Informe um ano entre 1900 e 2200.");
  }
  return year;
}
