export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          chamada: number | null
          created_at: string
          email: string | null
          id: string
          matricula: string | null
          nome: string
          owner_id: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          chamada?: number | null
          created_at?: string
          email?: string | null
          id?: string
          matricula?: string | null
          nome: string
          owner_id: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          chamada?: number | null
          created_at?: string
          email?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          owner_id?: string
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          comentario_devolutiva: string | null
          created_at: string
          data_aplicacao: string | null
          disciplina: string | null
          id: string
          instrucoes: string | null
          owner_id: string
          status: Database["public"]["Enums"]["status_avaliacao"]
          titulo: string
          turma_id: string | null
          updated_at: string
          valor_total: number
        }
        Insert: {
          comentario_devolutiva?: string | null
          created_at?: string
          data_aplicacao?: string | null
          disciplina?: string | null
          id?: string
          instrucoes?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["status_avaliacao"]
          titulo: string
          turma_id?: string | null
          updated_at?: string
          valor_total?: number
        }
        Update: {
          comentario_devolutiva?: string | null
          created_at?: string
          data_aplicacao?: string | null
          disciplina?: string | null
          id?: string
          instrucoes?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["status_avaliacao"]
          titulo?: string
          turma_id?: string | null
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      digitalizacoes_folhas: {
        Row: {
          altura_px: number
          aluno_id: string | null
          arquivo_original: string
          avaliacao_id: string
          confianca_leitura: number | null
          created_at: string
          folha_id: string | null
          id: string
          largura_px: number
          mime_original: string
          modelo_id: string | null
          owner_id: string
          pagina_modelo: number | null
          pagina_origem: number
          processado_at: string | null
          recorte: Json
          resultado_leitura: Json | null
          rotacao: number
          status: string
          storage_path: string
          tamanho_bytes: number
          updated_at: string
        }
        Insert: {
          altura_px: number
          aluno_id?: string | null
          arquivo_original: string
          avaliacao_id: string
          confianca_leitura?: number | null
          created_at?: string
          folha_id?: string | null
          id?: string
          largura_px: number
          mime_original: string
          modelo_id?: string | null
          owner_id: string
          pagina_modelo?: number | null
          pagina_origem?: number
          processado_at?: string | null
          recorte: Json
          resultado_leitura?: Json | null
          rotacao?: number
          status?: string
          storage_path: string
          tamanho_bytes: number
          updated_at?: string
        }
        Update: {
          altura_px?: number
          aluno_id?: string | null
          arquivo_original?: string
          avaliacao_id?: string
          confianca_leitura?: number | null
          created_at?: string
          folha_id?: string | null
          id?: string
          largura_px?: number
          mime_original?: string
          modelo_id?: string | null
          owner_id?: string
          pagina_modelo?: number | null
          pagina_origem?: number
          processado_at?: string | null
          recorte?: Json
          resultado_leitura?: Json | null
          rotacao?: number
          status?: string
          storage_path?: string
          tamanho_bytes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digitalizacoes_folhas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digitalizacoes_folhas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digitalizacoes_folhas_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_respostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digitalizacoes_folhas_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_folha_respostas"
            referencedColumns: ["id"]
          },
        ]
      }
      folhas_respostas: {
        Row: {
          aluno_id: string | null
          avaliacao_id: string
          codigo: string
          created_at: string
          id: string
          modelo_id: string
          owner_id: string
          qr_payload: string | null
        }
        Insert: {
          aluno_id?: string | null
          avaliacao_id: string
          codigo?: string
          created_at?: string
          id?: string
          modelo_id: string
          owner_id: string
          qr_payload?: string | null
        }
        Update: {
          aluno_id?: string | null
          avaliacao_id?: string
          codigo?: string
          created_at?: string
          id?: string
          modelo_id?: string
          owner_id?: string
          qr_payload?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folhas_respostas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_respostas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_respostas_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_folha_respostas"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_connections: {
        Row: {
          created_at: string
          google_email: string
          refresh_token_ciphertext: string
          refresh_token_iv: string
          scopes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_email: string
          refresh_token_ciphertext: string
          refresh_token_iv: string
          scopes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_email?: string
          refresh_token_ciphertext?: string
          refresh_token_iv?: string
          scopes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gmail_oauth_states: {
        Row: {
          created_at: string
          expected_email: string
          expires_at: string
          return_url: string
          state_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_email: string
          expires_at: string
          return_url: string
          state_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expected_email?: string
          expires_at?: string
          return_url?: string
          state_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      modelos_folha_respostas: {
        Row: {
          avaliacao_id: string
          colunas: number
          created_at: string
          id: string
          linhas_por_coluna: number
          orientacao: string
          owner_id: string
          snapshot: Json
          versao: number
        }
        Insert: {
          avaliacao_id: string
          colunas: number
          created_at?: string
          id?: string
          linhas_por_coluna: number
          orientacao: string
          owner_id: string
          snapshot: Json
          versao: number
        }
        Update: {
          avaliacao_id?: string
          colunas?: number
          created_at?: string
          id?: string
          linhas_por_coluna?: number
          orientacao?: string
          owner_id?: string
          snapshot?: Json
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "modelos_folha_respostas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          escola: string | null
          id: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          escola?: string | null
          id: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          escola?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questoes: {
        Row: {
          anulada: boolean
          avaliacao_id: string
          conteudo: string | null
          created_at: string
          desconto_erro: number
          gabarito: string | null
          id: string
          num_digitos: number | null
          numero: number
          orientacao_correcao: string | null
          owner_id: string
          qtd_alternativas: number | null
          resposta_modelo: string | null
          resposta_modelo_imagem_path: string | null
          tipo: Database["public"]["Enums"]["tipo_questao"]
          updated_at: string
          valor: number
        }
        Insert: {
          anulada?: boolean
          avaliacao_id: string
          conteudo?: string | null
          created_at?: string
          desconto_erro?: number
          gabarito?: string | null
          id?: string
          num_digitos?: number | null
          numero: number
          orientacao_correcao?: string | null
          owner_id: string
          qtd_alternativas?: number | null
          resposta_modelo?: string | null
          resposta_modelo_imagem_path?: string | null
          tipo: Database["public"]["Enums"]["tipo_questao"]
          updated_at?: string
          valor?: number
        }
        Update: {
          anulada?: boolean
          avaliacao_id?: string
          conteudo?: string | null
          created_at?: string
          desconto_erro?: number
          gabarito?: string | null
          id?: string
          num_digitos?: number | null
          numero?: number
          orientacao_correcao?: string | null
          owner_id?: string
          qtd_alternativas?: number | null
          resposta_modelo?: string | null
          resposta_modelo_imagem_path?: string | null
          tipo?: Database["public"]["Enums"]["tipo_questao"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "questoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_alunos: {
        Row: {
          aluno_id: string
          avaliacao_id: string
          created_at: string
          feedback: string | null
          id: string
          nota_manual: number | null
          owner_id: string
          questao_id: string
          resposta: string | null
          updated_at: string
        }
        Insert: {
          aluno_id: string
          avaliacao_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          nota_manual?: number | null
          owner_id: string
          questao_id: string
          resposta?: string | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          avaliacao_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          nota_manual?: number | null
          owner_id?: string
          questao_id?: string
          resposta?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_alunos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_alunos_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          ano: number | null
          created_at: string
          id: string
          nome: string
          owner_id: string
          serie: string | null
          updated_at: string
        }
        Insert: {
          ano?: number | null
          created_at?: string
          id?: string
          nome: string
          owner_id: string
          serie?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number | null
          created_at?: string
          id?: string
          nome?: string
          owner_id?: string
          serie?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirmar_leitura_folha: {
        Args: {
          p_aluno_id: string
          p_digitalizacao_id: string
          p_modelo_id: string
          p_pagina: number
          p_resultado: Json
        }
        Returns: undefined
      }
      criar_ou_obter_folha_respostas: {
        Args: {
          p_aluno_id: string
          p_avaliacao_id: string
          p_colunas: number
          p_linhas_por_coluna: number
          p_orientacao: string
          p_snapshot: Json
        }
        Returns: {
          codigo: string
          folha_id: string
          modelo_id: string
          qr_payload: string
          versao: number
        }[]
      }
    }
    Enums: {
      status_avaliacao:
        | "elaboracao"
        | "pronta"
        | "aplicada"
        | "em_correcao"
        | "corrigida"
        | "devolvida"
      tipo_questao: "mc" | "ce" | "num" | "disc"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_avaliacao: [
        "elaboracao",
        "pronta",
        "aplicada",
        "em_correcao",
        "corrigida",
        "devolvida",
      ],
      tipo_questao: ["mc", "ce", "num", "disc"],
    },
  },
} as const
