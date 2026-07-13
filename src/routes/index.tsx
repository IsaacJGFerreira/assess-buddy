import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ClipboardList, FileText, LineChart } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">F</div>
            <span className="font-semibold tracking-tight">Folha</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
            <Button asChild><Link to="/auth">Começar</Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-20">
        <section className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Para professores</p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight md:text-6xl">
            Da montagem da prova à devolutiva do aluno, em um só lugar.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Configure a avaliação, imprima folhas de resposta profissionais, corrija automaticamente e
            devolva uma análise formativa que ajuda o aluno a entender seus erros.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth">Criar minha primeira avaliação</Link></Button>
          </div>
        </section>
        <section className="mt-24 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ClipboardList, t: "Monte a prova", d: "Múltipla escolha, certo/errado e numérica 000–999." },
            { icon: FileText, t: "Imprima a folha", d: "Layout A4 limpo, alto contraste, pronto para xerox." },
            { icon: CheckCircle2, t: "Corrija em minutos", d: "Digite as respostas e o sistema calcula tudo." },
            { icon: LineChart, t: "Devolva com análise", d: "Cada aluno recebe uma folha de correção formativa." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-lg border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
