# Taxnest — Especificação Completa de Produto (PRD v1)

> **Como usar este documento:** Este é um spec completo para construir o app do zero. Entregue-o a uma IA de codificação (Claude Code, Cursor, etc.). Toda a prosa explicativa está em português para você ler e editar. **Todo texto de interface (UI copy), nomes de campos, variáveis e código devem permanecer em inglês**, porque o app é para o mercado dos EUA. Os valores fiscais citados são de referência (ano-base 2025) e em produção são buscados dinamicamente pela camada de IA — não os trate como fixos.

---

## 0. Instrução-mestra para a IA construtora

Você vai construir um app mobile de **iOS (apenas iOS no MVP)** chamado **Taxnest**. É um app de assinatura de cálculo fiscal para freelancers americanos. O objetivo central do produto: **dizer ao usuário exatamente quanto dinheiro separar de cada pagamento que ele recebe, para que ele nunca seja pego de surpresa pela conta de imposto no fim do ano.**

Princípios inegociáveis de engenharia:

1. **O motor de cálculo é 100% determinístico.** Nenhum número fiscal é gerado por IA. A IA só (a) busca dados oficiais do IRS uma vez por ano e (b) explica resultados em linguagem natural. O cálculo em si é código puro, testável e auditável.
2. **Os dados fiscais vêm de uma camada de configuração** (`TaxConfig`), nunca hardcoded espalhados pelo código. Há uma única fonte da verdade por ano fiscal.
3. **iOS-first.** Nada de Android no MVP. Não escreva código de plataforma cruzada que comprometa a qualidade no iOS, mas use uma stack que permita portar para Android depois sem reescrever a lógica de negócio.
4. **Privacidade-first.** Dados financeiros do usuário ficam no dispositivo por padrão. Sync em nuvem é opcional e criptografado.
5. **Cobertura de testes obrigatória no motor fiscal.** Cada regra de cálculo tem teste unitário com casos conhecidos.

Leia o documento inteiro antes de começar. Construa na ordem do roadmap (Seção 14).

---

## 1. Visão geral do produto

**Nome:** Taxnest
**Plataforma MVP:** iOS (iPhone), App Store EUA
**Categoria App Store:** Finance
**Modelo:** Assinatura (RevenueCat) — sem tier gratuito
**Mercado:** Estados Unidos

**One-liner:** "Know exactly how much to set aside from every payment — before tax season catches you off guard."

**O problema:** Nos EUA não há retenção automática de imposto sobre renda de freelancer. O cliente paga o valor bruto; o freelancer precisa calcular e pagar imposto sozinho, em parcelas trimestrais (estimated quarterly taxes), incluindo o self-employment tax de 15.3%. Quem não separa dinheiro ao longo do ano chega em abril com uma conta de US$ 5.000–15.000 que não tem, e ainda leva multa por não ter pago os trimestres.

**A solução:** Um app que, a cada pagamento recebido, diz instantaneamente quanto separar. Acompanha as fontes de renda ao longo do ano, projeta a conta total, lembra dos prazos trimestrais e gera um relatório pronto para o contador.

**Diferencial central (posicionamento):** Todos os concorrentes são **reativos** — resolvem o imposto depois, na declaração anual (TurboTax, H&R Block) ou são ferramentas de contabilidade caras e complexas (QuickBooks). O Taxnest é **proativo**: resolve no momento em que o dinheiro entra. Esse é o gancho de marketing, da App Store description ao criativo de anúncio.

---

## 2. Público-alvo

### Persona primária — "The Irregular-Income Freelancer"

- Designer, dev, redator, consultor, fotógrafo, coach autônomo nos EUA.
- Renda mensal irregular, recebida via PayPal, Venmo, Stripe, Wise, Zelle ou transferência direta.
- Renda anual entre US$ 30k e US$ 150k.
- **Não tem contador fixo** ou só fala com um uma vez por ano.
- Não entende (ou evita pensar em) quarterly taxes até levar a primeira multa.
- Tem iPhone, paga por outras ferramentas (Adobe, Notion, Figma).

### Persona secundária — "The Multi-Platform Creator / Gig Worker"

- Criador de conteúdo (YouTube, TikTok, Substack, Patreon) ou gig worker.
- Renda de múltiplas plataformas simultâneas.
- Já paga por ferramentas de criação; nunca organizou o lado fiscal.

### Fora do público-alvo (não otimizar para):

- Empresas com funcionários (esses precisam de QuickBooks/payroll).
- Assalariados CLT puros (W-2) sem renda de freelance.
- Usuários fora dos EUA (sistema fiscal é específico).

---

## 3. Escopo do MVP

### Dentro do MVP

- Onboarding com coleta de perfil fiscal (estado, filing status, estimativa de renda anual).
- Tela "Add income": registrar um pagamento recebido e receber instantaneamente o valor a separar.
- Dashboard: total separado no ano, projeção da conta anual, próximo prazo trimestral.
- Cálculo de self-employment tax + federal income tax + state income tax.
- Lembretes push dos 4 prazos trimestrais.
- Free vs. Pro (gating, ver Seção 11).
- **Pro:** múltiplas fontes de renda, imposto estadual, deduções por categoria, histórico, relatório PDF, Q&A fiscal por IA.
- Camada de IA: busca anual de dados do IRS + Q&A.
- Paywall (RevenueCat).
- Disclaimers legais.

### Fora do MVP (roadmap futuro — Seção 15)

- Android.
- Integração bancária / open banking (Plaid).
- Importação automática de extratos.
- Multi-usuário / contador colaborativo.
- Cálculo de itemized deductions completo (MVP usa standard deduction).
- Annualized installment method (MVP usa método simplificado de safe harbor).
- Suporte a entidades (LLC, S-Corp) — MVP assume sole proprietor / Schedule C.

---

## 4. Stack técnica recomendada

> Recomendação primária com justificativa. A IA construtora deve seguir esta stack salvo instrução em contrário do Rodras.

**Framework:** **React Native + Expo (managed workflow).**

Por quê, mesmo sendo iOS-first:

- Permite portar para Android depois **sem reescrever a lógica de negócio** — só ajustes de UI. Como a decisão é "iOS-first, Android como expansão futura", isso preserva a opção sem custo agora.
- É a stack canônica para apps indie de assinatura: integração com **RevenueCat** é trivial e extremamente bem documentada.
- Melhor suporte de geração por IA (volume enorme de exemplos de treino), o que importa porque o app será construído por IA.
- O Rodras pode focar 100% no iOS no MVP e ativar Android com esforço marginal depois.

**Alternativa:** SwiftUI nativo, caso se queira o máximo de polish nativo iOS e não se importe de reescrever para Android no futuro. Para este projeto, a vantagem de optionality do React Native vence.

**Stack detalhada:**

| Camada              | Tecnologia                                                      | Observação                                          |
| ------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| App framework       | React Native + Expo SDK (latest stable)                         | Managed workflow                                    |
| Linguagem           | TypeScript (strict mode)                                        | Tipagem forte no motor fiscal é crítica             |
| Navegação           | Expo Router (file-based)                                        |                                                     |
| Estado              | Zustand                                                         | Leve, suficiente; evitar Redux                      |
| Persistência local  | SQLite via `expo-sqlite` + camada de repositório                | Dados financeiros no device                         |
| Sync opcional (Pro) | Supabase (Postgres + Auth + Row Level Security)                 | Criptografado; opt-in                               |
| Assinaturas         | RevenueCat SDK                                                  | Paywall, entitlements, trials                       |
| Push notifications  | Expo Notifications                                              | Lembretes de prazo                                  |
| Camada de IA        | OpenAI API (server-side, ver Seção 9)                        | Nunca chamar a API direto do app com chave embutida |
| Backend leve        | Supabase Edge Functions (Deno) ou um pequeno serviço serverless | Proxy da API de IA + entrega do TaxConfig           |
| Analytics           | PostHog ou Amplitude                                            | Eventos da Seção 13                                 |
| Geração de PDF      | `expo-print` + template HTML                                    | Relatório do contador                               |
| Crash reporting     | Sentry                                                          |                                                     |

**Regra de segurança crítica:** A chave da API da OpenAI **nunca** vai no app cliente. Toda chamada de IA passa por um endpoint backend (Supabase Edge Function ou serverless) que guarda a chave como variável de ambiente. O app fala com o seu backend; o backend fala com a OpenAI.

---

## 5. Arquitetura

### Visão de alto nível

```
┌─────────────────────────────────────────────────────────┐
│                     APP (iOS / React Native)             │
│                                                          │
│  UI Screens ──► Zustand store ──► Repositories ──► SQLite │
│                      │                                   │
│                      ▼                                   │
│            TaxEngine (determinístico, puro)              │
│                      │                                   │
│                      ▼                                   │
│              consome TaxConfig (do ano vigente)          │
└───────────────────────────┬─────────────────────────────┘
                            │  (HTTPS)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (serverless)                    │
│                                                          │
│  GET /tax-config/:year  ──► retorna TaxConfig em cache   │
│                                                          │
│  POST /ai/refresh-config ──► job anual:                  │
│        OpenAI API + web search (irs.gov)              │
│        ──► extrai valores ──► valida ──► salva TaxConfig  │
│                                                          │
│  POST /ai/ask  ──► Q&A fiscal contextual (Pro)           │
│        OpenAI API, recebe contexto do cálculo         │
└─────────────────────────────────────────────────────────┘
```

### Princípio de separação

- **TaxEngine** recebe `TaxConfig` + inputs do usuário e devolve números. É uma função pura, sem efeitos colaterais, sem rede, sem IA. 100% testável.
- **TaxConfig** é um objeto de dados (JSON) com todas as alíquotas, brackets, limites e prazos de um ano fiscal. Buscado do backend, cacheado localmente.
- **Camada de IA** só toca o `TaxConfig` (escrevendo, no job anual) e o Q&A (lendo contexto). Nunca calcula imposto.

Isso garante que um número fiscal errado nunca vem de "alucinação" — só pode vir de um `TaxConfig` errado, que é validado e auditável.

---

## 6. Lógica fiscal detalhada (o coração do app)

> Esta é a parte mais sensível. Implemente exatamente esta lógica. Todos os números abaixo são **referência do ano-base 2025** e em produção vêm do `TaxConfig`. Inclua testes unitários para cada bloco.

### 6.1 Conceitos

O imposto total de um freelancer sole-proprietor (Schedule C) tem três componentes que o app calcula:

1. **Self-Employment Tax (SE tax)** — equivalente ao INSS dos dois lados (empregado + empregador).
2. **Federal Income Tax** — imposto de renda federal progressivo.
3. **State Income Tax** — imposto estadual (varia muito por estado; alguns não têm).

### 6.2 Self-Employment Tax (Schedule SE)

```
net_profit = receita_bruta − despesas_dedutíveis_do_negócio

NESE (Net Earnings from Self-Employment) = net_profit × 0.9235
   // o fator 0.9235 remove a "parte do empregador" antes de aplicar a alíquota

// Componente Social Security: 12.4%, com teto (wage base)
ss_wage_base = TaxConfig.se.social_security_wage_base   // ref 2025: 176_100
ss_taxable = min(NESE, ss_wage_base)
social_security_tax = ss_taxable × 0.124

// Componente Medicare: 2.9%, SEM teto
medicare_tax = NESE × 0.029

// Additional Medicare Tax: 0.9% sobre o que excede o threshold do filing status
addl_medicare_threshold = TaxConfig.se.additional_medicare_threshold[filing_status]
   // ref 2025: single 200_000 / MFJ 250_000 / MFS 125_000
addl_medicare_tax = max(0, NESE − addl_medicare_threshold) × 0.009

se_tax = social_security_tax + medicare_tax + addl_medicare_tax

// METADE do SE tax é dedutível acima da linha (reduz o AGI)
se_tax_deduction = (social_security_tax + medicare_tax) / 2
   // nota: a parte adicional de Medicare NÃO entra na dedução de metade
```

### 6.3 Federal Income Tax

```
// AGI (Adjusted Gross Income)
above_the_line_deductions = se_tax_deduction
   + retirement_contributions   // SEP-IRA, Solo 401k (Pro; MVP pode tratar como 0 ou input opcional)
   + self_employed_health_insurance   // opcional
agi = net_profit − above_the_line_deductions
   // (em um app só de freelance; se houver outras rendas, somar antes)

// Dedução
standard_deduction = TaxConfig.federal.standard_deduction[filing_status]
   // ref 2025: single 15_000 / MFJ 30_000 / HoH 22_500
deduction = standard_deduction   // MVP usa sempre standard; itemized fica fora do MVP

// QBI Deduction (Section 199A) — relevante para freelancers
// Para usuários ABAIXO do threshold (a maioria do público): simplesmente 20% do QBI
qbi_threshold = TaxConfig.federal.qbi_threshold[filing_status]
   // ref 2025: single ~197_300 / MFJ ~394_600
if taxable_income_before_qbi <= qbi_threshold:
    qbi_deduction = 0.20 × min(qbi, taxable_income_before_qbi − net_capital_gains)
       // qbi ≈ net_profit − se_tax_deduction (simplificação aceitável p/ Schedule C)
else:
    // acima do threshold há limitações (W-2 wages, UBIA, SSTB phase-out)
    // MVP: marcar como "consulte um profissional" e usar qbi_deduction = 0
    //      OU implementar phase-out completo no roadmap
    qbi_deduction = 0   // conservador no MVP

taxable_income = max(0, agi − deduction − qbi_deduction)

// Aplicar brackets progressivos
federal_income_tax = apply_progressive_brackets(
    taxable_income,
    TaxConfig.federal.brackets[filing_status]
)
```

**Brackets federais de referência 2025 (single)** — em produção vêm do `TaxConfig`:

| Alíquota | Faixa (taxable income) |
| -------- | ---------------------- |
| 10%      | $0 – $11,925           |
| 12%      | $11,925 – $48,475      |
| 22%      | $48,475 – $103,350     |
| 24%      | $103,350 – $197,300    |
| 32%      | $197,300 – $250,525    |
| 35%      | $250,525 – $626,350    |
| 37%      | $626,350+              |

```
function apply_progressive_brackets(income, brackets):
    tax = 0
    for each bracket in brackets:
        if income > bracket.lower:
            taxed_in_bracket = min(income, bracket.upper) − bracket.lower
            tax += taxed_in_bracket × bracket.rate
    return tax
```

### 6.4 State Income Tax

```
state_config = TaxConfig.states[user_state]

if state_config.type == "none":
    state_tax = 0
    // estados sem imposto de renda (ref): AK, FL, NV, SD, TN, TX, WY,
    // NH (só juros/dividendos, em phase-out), WA (só ganho de capital)
else if state_config.type == "flat":
    state_tax = state_taxable_income × state_config.rate
else if state_config.type == "progressive":
    state_tax = apply_progressive_brackets(state_taxable_income, state_config.brackets)

// state_taxable_income geralmente parte do AGI federal com ajustes estaduais.
// MVP: usar AGI − state_standard_deduction (do TaxConfig por estado) como aproximação,
//      e exibir disclaimer de que regras estaduais variam.
```

### 6.5 Total e a conta trimestral

```
total_annual_tax = se_tax + federal_income_tax + state_tax

// Estimated quarterly: divide a projeção anual em 4
// (MVP usa divisão simples; income lumpy → annualized method fica no roadmap)
quarterly_payment = total_annual_tax / 4
```

### 6.6 Safe Harbor (evitar multa por subpagamento)

```
// O usuário evita multa se pagar o MENOR entre:
//   (a) 90% do imposto do ano corrente, OU
//   (b) 100% do imposto do ano anterior  (110% se AGI do ano anterior > 150_000)

safe_harbor_current = 0.90 × total_annual_tax
prior_year_multiplier = (prior_year_agi > 150_000) ? 1.10 : 1.00
safe_harbor_prior = prior_year_tax × prior_year_multiplier   // se o usuário informou

required_annual_payment = min(safe_harbor_current, safe_harbor_prior)
   // se não há dado do ano anterior, usar safe_harbor_current

// Mostrar ao usuário: "Pague pelo menos $X por trimestre para ficar protegido."
```

### 6.7 O cálculo central: "quanto separar deste pagamento?"

Este é o core loop do app. Quando o usuário registra um novo pagamento:

```
// Abordagem MARGINAL sobre projeção (mais precisa) — recomendada:
projected_income_before = soma de todos os pagamentos do ano até agora (antes deste)
projected_income_after  = projected_income_before + novo_pagamento

tax_before = TaxEngine.total_annual_tax(projected_income_before, perfil)
tax_after  = TaxEngine.total_annual_tax(projected_income_after, perfil)

set_aside_for_this_payment = tax_after − tax_before

// Exibir: "Set aside $Y from this $X payment."
// Y / X = a alíquota marginal efetiva real daquele pagamento.

// Abordagem EFETIVA (fallback simples, menos precisa):
effective_rate = projected_total_tax / projected_total_income
set_aside = novo_pagamento × effective_rate
```

Use a abordagem marginal. Ela reflete que pagamentos mais altos no ano caem em brackets maiores, o que é exatamente o tipo de precisão que justifica o app existir.

### 6.8 Casos de teste obrigatórios (exemplos)

Crie testes unitários para, no mínimo:

1. Freelancer single, $60k net profit, estado sem imposto (TX) → validar SE tax, federal, total.
2. Freelancer single, $60k, Califórnia (progressive) → validar state tax.
3. Renda acima do SS wage base ($200k) → validar teto do Social Security e Additional Medicare.
4. Renda abaixo do standard deduction → taxable income = 0, federal tax = 0, mas SE tax ainda existe.
5. Safe harbor: ano anterior com AGI > $150k → multiplicador 110%.
6. Marginal set-aside: terceiro pagamento que cruza um bracket → set-aside maior que o efetivo médio.

---

## 7. Modelo de dados

### Entidades (SQLite local; espelhadas no Supabase se sync Pro ativo)

```typescript
// User profile (1 por usuário)
type UserProfile = {
  id: string;
  filing_status: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
  state: string; // código de 2 letras: "CA", "TX", ...
  estimated_annual_income: number; // estimativa inicial do onboarding
  prior_year_tax?: number; // opcional, para safe harbor
  prior_year_agi?: number; // opcional
  retirement_contributions?: number; // Pro
  self_employed_health_insurance?: number; // Pro
  created_at: string;
  updated_at: string;
};

// Income source (Pro: ilimitado; Free: 1)
type IncomeSource = {
  id: string;
  name: string; // "Upwork", "Direct clients", "Patreon"
  color: string; // para UI
  created_at: string;
};

// Payment (cada pagamento recebido)
type Payment = {
  id: string;
  income_source_id: string;
  amount: number;
  date: string; // ISO date
  set_aside_amount: number; // calculado no momento do registro
  note?: string;
  tax_year: number;
  created_at: string;
};

// Deduction (Pro)
type Deduction = {
  id: string;
  category:
    | 'home_office'
    | 'software'
    | 'equipment'
    | 'travel'
    | 'education'
    | 'supplies'
    | 'other';
  amount: number;
  date: string;
  note?: string;
  tax_year: number;
};

// Quarterly payment log (registro de pagamentos ao IRS)
type QuarterlyPayment = {
  id: string;
  quarter: 1 | 2 | 3 | 4;
  tax_year: number;
  amount_paid: number;
  date_paid: string;
  is_paid: boolean;
};
```

### TaxConfig (entregue pelo backend, cacheado localmente)

```typescript
type TaxConfig = {
  tax_year: number;
  last_updated: string; // quando o job de IA atualizou
  source_urls: string[]; // URLs do irs.gov de onde os dados vieram (auditoria)

  se: {
    social_security_wage_base: number; // ref 2025: 176100
    social_security_rate: number; // 0.124
    medicare_rate: number; // 0.029
    additional_medicare_rate: number; // 0.009
    additional_medicare_threshold: Record<FilingStatus, number>;
    nese_factor: number; // 0.9235
  };

  federal: {
    standard_deduction: Record<FilingStatus, number>;
    brackets: Record<FilingStatus, Bracket[]>;
    qbi_threshold: Record<FilingStatus, number>;
    qbi_rate: number; // 0.20
  };

  quarterly_deadlines: string[]; // 4 datas ISO do ano

  states: Record<string, StateConfig>; // por código de estado
};

type Bracket = { lower: number; upper: number; rate: number };

type StateConfig =
  | { type: 'none' }
  | { type: 'flat'; rate: number; standard_deduction: number }
  | { type: 'progressive'; brackets: Bracket[]; standard_deduction: number };

type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
```

---

## 8. Design (UI/UX) e Telas

### 8.0 Fundação de design

#### Filosofia

O app lida com dinheiro e imposto — assuntos que geram ansiedade. **O trabalho da UX é fazer uma coisa estressante parecer calma, clara e sob controle.** Cada tela deve reduzir ansiedade, nunca adicionar. O sentimento central que o produto entrega é "you're covered" — você está protegido, não vai ser pego de surpresa. Tudo no design serve a isso: confiança tranquila, sem ruído, uma ação principal por tela, linguagem simples no lugar de jargão fiscal.

Referência de qualidade: a confiança de um bom app bancário com a leveza de uma ferramenta pessoal. Não é uma fintech espalhafatosa nem uma planilha sem alma.

#### Princípios de UX (regras de ouro)

1. **O número é o herói.** Na maioria das telas, o elemento maior é uma cifra em dólar. Hierarquia visual gira em torno do número que importa naquela tela.
2. **Uma ação principal por tela.** Um único CTA primário dominante; o resto é secundário ou terciário.
3. **Resposta primeiro, detalhe depois (progressive disclosure).** Mostre o resultado ("Set aside $612") imediatamente; o detalhamento (breakdown, "como foi calculado") aparece ao toque, nunca empurrado de cara.
4. **Tranquilização embutida.** A copy reforça proteção: "That keeps you covered", "You're on track", "You're protected for this quarter."
5. **Zero jargão por padrão.** Todo termo fiscal (SE tax, safe harbor, QBI) vem sempre com uma glosa em linguagem simples na primeira aparição, ou um ícone "ⓘ" que abre explicação.
6. **Perdoador.** Editar e apagar são fáceis; usar undo onde possível (ex.: snackbar "Payment deleted — Undo"). Nunca punir o usuário por errar um input.
7. **Core loop rápido.** Registrar um pagamento e ver quanto separar deve levar menos de 10 segundos, com o mínimo de toques.
8. **Empty states ensinam.** Toda lista vazia explica o que vai aparecer ali e convida à primeira ação — nunca uma tela em branco.
9. **Acessibilidade não é opcional.** Dynamic Type (texto escalável), VoiceOver com labels descritivos em todo elemento interativo, contraste mínimo AA, área de toque mínima de 44×44pt.

#### Linguagem visual

**Direção estética:** "calm financial clarity". Superfícies limpas, muito espaço em branco, cards suaves, tipografia confiante. Nada de gradientes berrantes, sombras pesadas ou densidade de planilha.

**Paleta (design tokens).** Cor primária em verde profundo — verde carrega segurança, dinheiro e "go/você está coberto", que é exatamente a carga emocional do produto. Cinzas neutros para estrutura. Um accent quente reservado **exclusivamente** para o momento "set aside" (o clímax do app). Cores semânticas usadas com parcimônia.

```
Tokens (light mode — definir os equivalentes dark):
  --color-primary           #0F6E56   // deep green — marca, CTAs primários
  --color-primary-tint      #E1F5EE   // fundo de destaque/sucesso
  --color-accent            #D85A30   // coral quente — só no momento "set aside"
  --color-text-primary      #1A1A1A
  --color-text-secondary    #6B6B6B
  --color-text-tertiary     #9A9A9A
  --color-background         #FFFFFF
  --color-surface           #F7F7F5   // cards, agrupamentos
  --color-border            rgba(0,0,0,0.08)
  --color-success           #1D9E75   // "covered / paid / on track"
  --color-warning           #BA7517   // "deadline approaching"
  --color-danger            #C0392B   // "overdue / missed" — uso raro
Dark mode: inverter superfícies (fundo near-black, cards um degrau acima),
manter o verde primário com brilho ajustado, garantir contraste AA.
```

**Tipografia:** SF Pro (fonte de sistema iOS) — dá sensação nativa e suporta Dynamic Type de graça. As cifras em dólar usam **tabular figures** (números monoespaçados) para alinhar verticalmente em listas e evitar "pulo" ao animar. Escala: números-herói grandes e em peso semibold; títulos médios; corpo confortável; labels/captions menores em cinza secundário.

```
Escala tipográfica (referência):
  Hero number     34–40pt, semibold, tabular
  Screen title    22pt, bold
  Section header  17pt, semibold
  Body            16pt, regular
  Secondary       15pt, regular, text-secondary
  Caption/label   13pt, regular, text-tertiary
```

**Layout e espaçamento:** grid base de 8pt. Margens laterais generosas (16–20pt). Cards com cantos arredondados (radius ~14pt) e respiro interno. Agrupamentos visuais claros separando blocos de informação.

**Componentes:** controles nativos do iOS sempre que possível (pickers, switches, sheets). SF Symbols para ícones. Bottom sheets para ações rápidas (add income, add deduction) em vez de telas cheias quando couber. Cards como unidade visual principal do dashboard.

**Dark mode:** suporte completo, seguindo o tema do sistema. Todos os tokens têm equivalente dark.

#### Navegação e arquitetura de informação

**Tab bar inferior** com 4 destinos fixos, e o "+ Add income" como botão de ação proeminente (botão central destacado ou FAB sobre a Home):

```
┌──────────────────────────────────────────────┐
│                                              │
│                  (conteúdo)                  │
│                                              │
├──────────────────────────────────────────────┤
│   Home      Income    [ + ]   Taxes   More   │
│   (house)   (list)   (add)   (cal)   (•••)   │
└──────────────────────────────────────────────┘
```

- **Home** — dashboard (8.2)
- **Income** — histórico de pagamentos (8.4)
- **[ + ] Add income** — ação central, abre bottom sheet do core loop (8.3)
- **Taxes** — quarterly tracker (8.6)
- **More** — hub para Deductions (8.5), Reports (8.7), Ask (8.8), Settings (8.9)

As features Pro de maior valor (Deductions, Reports, Ask) também aparecem como **cards de entrada na Home**, para não ficarem escondidas no "More" — com cadeado/CTA de upgrade quando o usuário é Free.

#### Motion e micro-interações

Movimento serve a clareza e tranquilidade, nunca decoração. Use com restrição.

- **O momento "set aside"** é o único com destaque de motion: ao confirmar um pagamento, o valor a separar entra com uma animação suave de count-up (número subindo até o valor) e um leve realce no accent coral. É o clímax emocional — "pronto, está resolvido".
- **Números que mudam** (total do ano, projeção) animam por count-up curto quando atualizam, em vez de trocar bruscamente.
- **Transições** entre telas seguem o padrão nativo iOS (push/sheet). Bottom sheets deslizam de baixo.
- **Feedback tátil** (haptics) leve ao confirmar ações importantes (pagamento salvo, trimestre marcado como pago).
- **Respeitar "Reduce Motion"**: quando ativado no sistema, substituir animações por fades simples.

#### Estados (aplicar em todas as telas)

Toda tela e lista deve tratar explicitamente:

- **Empty** — sem dados ainda: ilustração/ícone leve + uma frase do que vai aparecer + CTA da primeira ação. Ex. (Income vazio): "No income yet. Add your first payment to see how much to set aside."
- **Loading** — buscar TaxConfig, gerar PDF, resposta de IA: skeleton ou spinner discreto; nunca travar a UI inteira sem indicação.
- **Error** — falha de cálculo/rede/IA: mensagem clara em linguagem do usuário + ação de recuperação ("Try again"). Nunca erro cru ou silencioso. Se o TaxConfig não puder ser obtido, usar o último cacheado e avisar discretamente.
- **Success/confirmation** — ação concluída: confirmação curta (snackbar/haptic), sem bloquear o fluxo.

#### Tom de voz (copy)

Claro, tranquilizador, humano. Voz ativa. Frases curtas. O imposto é o vilão; o app é o aliado do usuário. Erros não culpam o usuário. Exemplos do registro desejado: "You're covered for this payment." / "Heads up — your Q3 payment is due in 9 days." / "Add your first payment to get started." Evitar: linguagem de planilha, jargão sem glosa, promessas de exatidão ("guaranteed", "exact") — sempre "estimate/projection/helps you plan".

> Nota geral de implementação: seguir as Human Interface Guidelines do iOS. Todas as strings de interface em inglês.

---

### 8.1 Onboarding (primeira abertura)

**Objetivo de UX:** coletar o mínimo para o primeiro cálculo, sem parecer um formulário fiscal. Uma pergunta por tela, progresso visível, tom acolhedor. O usuário deve sentir que está sendo configurado um assistente pessoal, não preenchendo um imposto.

**Layout:** tela única por pergunta, com barra de progresso no topo (ex.: "●●●○○○○"), título grande, controle de input centralizado, CTA primário fixo embaixo. Botão "Back" discreto. Transições laterais suaves entre passos.

Sequência:

Sequência de telas curtas:

1. **Welcome** — headline: "Never get surprised by taxes again." Subtext do core value. CTA: "Get started".
2. **Filing status** — seleção: Single / Married filing jointly / Married filing separately / Head of household.
3. **State** — picker de estado (lista de 50 + DC). Se o estado não tem imposto de renda, mostrar microcopy: "Good news — [State] has no state income tax."
4. **Income estimate** — "Roughly how much do you expect to make this year from freelancing?" Slider ou input com faixas. Usado para a primeira projeção; ajustável depois.
5. **(Opcional) Prior year** — "Did you file taxes as a freelancer last year?" Se sim, pede prior_year_tax e prior_year_agi (para safe harbor). Skippable.
6. **Disclaimer** — tela curta: "Taxnest provides estimates to help you plan. It is not tax advice and does not replace a tax professional." Botão "I understand".
7. **Notification permission** — "Want reminders before each quarterly deadline?" → solicita permissão de push.

Ao fim, cria o `UserProfile`, baixa o `TaxConfig` do ano vigente, vai para o Dashboard.

### 8.2 Dashboard (Home)

**Objetivo de UX:** numa olhada, o usuário sabe se está em dia. A pergunta que esta tela responde é "estou protegido?" — e a resposta deve ser instantânea e tranquilizadora.

**Hierarquia visual (de cima para baixo):**

```
┌──────────────────────────────────────┐
│  Hi 👋            [year selector ▾]  │   header leve
│                                      │
│   Set aside this year                │   label secundário
│   $4,820                             │   ◄ HERO NUMBER (maior elemento)
│   You're covered so far ✓            │   reforço em verde/success
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Next quarterly payment          │  │   card destacado
│  │ Q3 · due Sep 15 · in 23 days    │  │   cor muda c/ proximidade:
│  │ Suggested: $1,640               │  │   neutro→amber→danger
│  └────────────────────────────────┘  │
│                                      │
│  ┌─────────────┐  ┌─────────────┐    │
│  │ Projected    │  │ Effective    │   │   dois cards menores
│  │ annual tax   │  │ tax rate     │   │   (tap no 1º → breakdown)
│  │ $7,200      │  │ 22%         │    │
│  └─────────────┘  └─────────────┘    │
│                                      │
│  ── Pro features (cards de entrada)──│   só se houver espaço/valor
│  [ Deductions 🔒 ] [ Reports 🔒 ]    │   cadeado se Free
│                                      │
└──────────────────────────────────────┘
         (tab bar com [+] central)
```

**Componentes e comportamento:**

- **Hero — "Set aside this year":** soma de `set_aside_amount` do ano. Maior elemento da tela, tabular, semibold. Logo abaixo, um selo de status em verde: "You're covered so far ✓" quando os pagamentos trimestrais estão em dia; muda de tom se houver trimestre vencido.
- **Card "Next quarterly payment":** data, countdown ("in 23 days") e valor sugerido (safe harbor, Pro; estimativa simples no Free). **A cor do card evolui com a proximidade:** neutro quando distante, âmbar quando "due soon" (≤14 dias), vermelho discreto se vencido e não pago. Tap → abre o Quarterly tracker (8.6).
- **Card "Projected annual tax":** resultado do `TaxEngine`. Tap → expande breakdown (SE tax / Federal / State) num sheet, cada linha com glosa em uma frase. Free vê o total federal+SE; State aparece bloqueado/upsell.
- **Card "Effective tax rate":** projected_total_tax ÷ projected_total_income, em %. Tap → tooltip explicando o que é taxa efetiva vs. marginal.
- **Cards de entrada Pro** (Deductions / Reports / Ask): atalhos com ícone; cadeado + CTA de upgrade quando Free.
- **Botão central [+] da tab bar:** ação primária global → abre o bottom sheet de Add income (8.3).
- **Year selector:** canto superior, permite ver anos anteriores (read-only para anos fechados).

**Estados:**

- _Empty_ (usuário novo, zero pagamentos): hero mostra "$0" com copy convidativa — "Add your first payment to see how much to set aside" — e uma seta apontando para o botão [+]. Cards de projeção mostram a estimativa do onboarding com rótulo "Based on your estimate".
- _Loading TaxConfig_: skeleton nos cards.
- _Error_: usa último TaxConfig cacheado + banner discreto "Using last saved tax rates".

**Motion:** o hero e a projeção fazem count-up curto quando atualizam após um novo pagamento.

### 8.3 Add income (core loop) — a tela mais importante

**Objetivo de UX:** transformar "recebi dinheiro" em "sei quanto guardar" no menor número de toques possível, terminando num momento de alívio. Esta é a interação que define o produto. Meta: menos de 10 segundos.

**Formato:** **bottom sheet** (não tela cheia) que sobe ao tocar o [+], com o teclado numérico já aberto e o foco no campo de valor. Sheet em dois estágios: input → resultado.

**Estágio 1 — Input:**

```
┌──────────────────────────────────────┐
│  ▔▔▔  (grabber do sheet)              │
│  Add income                    [ X ]  │
│                                      │
│        $ 2,400|                      │   ◄ campo grande, foco imediato,
│                                      │     teclado numérico aberto
│  Source:  [ Direct clients  ▾ ]      │   (Pro; oculto/implícito no Free)
│  Date:    [ Today ▾ ]                │   default hoje, editável
│  Note:    [ optional ]               │   opcional, recolhido
│                                      │
│         [   Calculate   ]            │   CTA primário, full-width
└──────────────────────────────────────┘
```

- **Campo amount:** dominante, formatação de moeda ao digitar ($ e separador de milhar automáticos), tabular. Teclado numérico aberto por padrão.
- **Source (Pro):** picker com as income sources do usuário + opção "Add new". No Free, oculto (fonte única implícita).
- **Date:** default "Today"; tap abre date picker nativo.
- **Note:** opcional, recolhido atrás de "Add note" para não poluir.
- **CTA "Calculate":** full-width, cor primária.

**Estágio 2 — O momento "set aside" (clímax):**

Ao calcular, o sheet transiciona para o resultado. O `TaxEngine` computa o set-aside **marginal** (Seção 6.7). Este é o único momento do app com destaque de motion e uso do accent coral.

```
┌──────────────────────────────────────┐
│  ▔▔▔                                  │
│                                      │
│            Set aside                 │   label
│            $612                      │   ◄ count-up animado, accent coral,
│                                      │     maior elemento da tela
│       from this $2,400 payment       │   contexto
│                                      │
│   ✓ That keeps you covered for taxes │   reforço em verde/success
│                                      │
│   How is this calculated?  ⓘ         │   link discreto → explainer
│                                      │
│   [  Add another  ]   [   Done   ]   │   duas saídas
└──────────────────────────────────────┘
```

- **"Set aside $612":** entra com **count-up** (número subindo de 0 até o valor) e leve realce no coral. Haptic leve de confirmação. É o pico emocional — "resolvido".
- **Reforço:** "That keeps you covered for taxes" em verde, fechando o loop de tranquilidade.
- **"How is this calculated?":** abre um explainer mostrando, em linguagem simples, a composição daquele valor (parte de SE tax, parte de federal, parte de state). No **Pro**, esse explainer tem um atalho "Ask about this" que leva ao Q&A de IA (8.8) já com contexto.
- **Saídas:** "Add another" (volta ao estágio 1, para quem está lançando vários de uma vez) e "Done" (salva o `Payment` com `set_aside_amount` e fecha; Home faz count-up do novo total).

**Estados:**

- _Input inválido_ (valor 0 ou vazio): CTA desabilitado, sem erro agressivo.
- _Cálculo_: instantâneo (é local); se houver microdelay, o count-up cobre.
- _Primeira vez_: após o primeiro "Done", um tooltip único aponta para a Home — "Your set-aside total lives here."

**Por que marginal importa na UX:** como o app usa a alíquota marginal sobre a projeção do ano, pagamentos mais altos mais tarde no ano mostram um set-aside proporcionalmente maior (cruzam brackets superiores). Isso é correto e é precisamente o tipo de precisão que justifica o app — mas pode surpreender o usuário. Por isso o link "How is this calculated?" existe: para explicar, quando ele notar, por que a porcentagem variou entre um pagamento e outro.

### 8.4 Income history

**Objetivo de UX:** ver tudo que entrou e quanto já foi reservado, com confiança de que nada se perdeu.

**Layout:** lista cronológica reversa (mais recente no topo), agrupada por mês com cabeçalhos de seção. Total do ano fixo no topo. Cada item:

```
┌──────────────────────────────────────┐
│  Total income · 2025          $21,900 │   sticky header
├──────────────────────────────────────┤
│  September                            │   section header
│  ● Direct clients      $2,400         │   ● = cor da source
│    Set aside $612 · Sep 12            │   linha secundária menor
│  ● Upwork              $800           │
│    Set aside $176 · Sep 5             │
│  August                               │
│  ...                                  │
└──────────────────────────────────────┘
```

- **Item:** valor à direita (tabular, alinhado), nome da source com bolinha colorida, e abaixo em cinza o set-aside + data. Swipe-to-delete com confirmação e undo (snackbar).
- **Tap no item:** abre detalhe/edição (valor, source, data, nota) — editar recalcula o set-aside e a projeção.
- **Filtro por source (Pro):** chip/segmented control no topo. Free vê a lista cronológica sem agrupamento por fonte e sem filtro.
- **Empty state:** "No income yet. Tap + to add your first payment."

### 8.5 Deductions (Pro)

**Objetivo de UX:** mostrar que registrar despesas do negócio reduz o imposto — tornando o benefício tangível e imediato.

**Layout:** total de deduções no topo com o impacto destacado, lista por categoria abaixo, FAB/botão "Add deduction".

```
┌──────────────────────────────────────┐
│  Deductions · 2025            $3,400  │
│  ↓ Lowered your projected tax by $810 │   ◄ impacto em verde — o gancho
├──────────────────────────────────────┤
│  🏠 Home office          $1,200       │   ícone por categoria
│  💻 Software             $640         │
│  🧰 Equipment            $900         │
│  ✈️ Travel               $660         │
└──────────────────────────────────────┘
        [ + Add deduction ]
```

- **Linha de impacto:** "Lowered your projected tax by $X" em verde — é o que faz o usuário querer registrar mais. Atualiza ao adicionar.
- **Add deduction:** bottom sheet (categoria via picker com ícones, valor, data, nota).
- **Categorias:** home_office, software, equipment, travel, education, supplies, other — cada uma com SF Symbol próprio.
- **Free:** tela mostra um preview borrado/ilustrativo do benefício com CTA "Unlock deductions with Pro".

### 8.6 Quarterly tracker

**Objetivo de UX:** o usuário sempre sabe quanto pagar, quando, e se já pagou — sem medo de multa.

**Layout:** os 4 trimestres como uma timeline vertical de cards, cada um com status visual claro.

```
┌──────────────────────────────────────┐
│  Estimated quarterly taxes · 2025     │
├──────────────────────────────────────┤
│  ✓ Q1  Apr 15   $1,400   Paid         │   verde, check
│  ✓ Q2  Jun 15   $1,500   Paid         │
│  ● Q3  Sep 15   $1,640   Due in 23d   │   ◄ atual, destacado (âmbar se ≤14d)
│  ○ Q4  Jan 15   $1,660   Upcoming     │   neutro
│                                      │
│  How to pay the IRS  →                │
└──────────────────────────────────────┘
```

- **Status por trimestre:** Paid (verde + check), Due soon (âmbar, com countdown), Upcoming (neutro), Overdue (vermelho discreto). O card do trimestre atual é o mais proeminente.
- **Valor sugerido:** safe harbor (Pro); estimativa simples (Free).
- **"Mark as paid":** registra `QuarterlyPayment`, vira verde, dispara haptic. Reversível.
- **"How to pay the IRS":** abre instrução curta e estática sobre IRS Direct Pay / EFTPS, com disclaimer (o app não processa pagamento, só orienta).
- **Empty/início do ano:** todos "Upcoming" com os valores projetados.

### 8.7 Reports (Pro)

**Objetivo de UX:** em um toque, gerar um documento que o usuário manda ao contador e sente que "está tudo organizado".

**Layout:** uma tela simples de pré-visualização + botão de geração.

- **CTA "Generate tax report (PDF)".**
- **Conteúdo do PDF:** resumo anual; renda total por source; deduções por categoria; SE tax / federal / state estimados; pagamentos trimestrais feitos; disclaimer no rodapé. Layout limpo, tipografia legível, pronto para impressão/email.
- **Após gerar:** opções nativas de share/save (sheet do iOS).
- **Loading state:** indicador enquanto o PDF é montado (`expo-print`).
- **Free:** bloqueado com preview de uma página de exemplo (marca d'água "Sample") + CTA de upgrade.

### 8.8 Ask (Pro) — Q&A fiscal por IA

**Objetivo de UX:** tirar dúvidas fiscais sem custo de um contador, com respostas claras e responsáveis.

**Layout:** interface de chat simples (não um chat contínuo pesado — perguntas pontuais).

```
┌──────────────────────────────────────┐
│  Ask about your taxes                 │
│                                      │
│  Suggested:                          │   chips de perguntas comuns
│  [ Can I deduct my home internet? ]  │
│  [ What if I miss a payment? ]       │
│  [ How does QBI work? ]              │
│                                      │
│  ...resposta...                      │
│  ⓘ General information, not tax advice│   disclaimer fixo no rodapé
│                                      │
│  [ Type your question…        ➤ ]    │
└──────────────────────────────────────┘
```

- **Chips de perguntas sugeridas** para reduzir a "tela em branco" e mostrar o que dá pra perguntar.
- **Envio:** vai ao backend `/ai/ask` com contexto numérico **anonimizado** (renda projetada, estado, filing status — sem nome/identidade).
- **Resposta:** linguagem clara; **disclaimer fixo** sempre visível ("This is general information, not tax advice"); recusa educada + sugestão de CPA quando a pergunta depende de circunstâncias que o app não conhece.
- **Free:** uma pergunta de degustação (ou zero), depois CTA de upgrade. **Pro:** ilimitado com rate limit razoável.
- **Loading:** indicador de "thinking"; _error_: "Couldn't reach the assistant — try again."

### 8.9 Settings

**Objetivo de UX:** controle total e transparência, sem fricção.

Agrupado em seções nativas (estilo iOS Settings):

- **Tax profile:** filing status, state, estimativa anual, prior year (editar recalcula tudo).
- **Income sources (Pro):** adicionar/renomear/recolorir/arquivar.
- **Cloud sync (Pro):** toggle; explica que é opcional e criptografado.
- **Notifications:** prazos trimestrais on/off.
- **Subscription:** estado atual, gerenciar/restore purchases (RevenueCat).
- **Tax year:** seletor de ano (histórico read-only).
- **About:** disclaimer completo, política de privacidade, termos, versão.

### 8.10 Paywall

**Objetivo de UX:** comunicar valor com honestidade e converter sem ser agressivo. Mostrar a transformação, não só uma lista de features.

**Layout:** tela apresentada como sheet ao tocar qualquer feature Pro (ou via card de upgrade).

```
┌──────────────────────────────────────┐
│  ▔▔▔                            [ X ] │
│  Stay covered all year                │   headline orientada a benefício
│                                      │
│  ✓ Track every income source         │   benefícios em linguagem
│  ✓ State taxes included               │   de resultado, não de feature
│  ✓ Deductions that lower your bill    │
│  ✓ Accountant-ready PDF reports       │
│  ✓ Ask tax questions anytime          │
│                                      │
│  ┌────────────┐  ┌────────────┐       │
│  │ Monthly     │  │ Annual ★    │      │   anual destacado
│  │ $4.99/mo    │  │ $39.99/yr   │      │   "Save 33% · ~$3.33/mo"
│  │             │  │ 7-day trial │      │
│  └────────────┘  └────────────┘       │
│                                      │
│        [   Start free trial   ]      │
│   Restore purchases · Terms · Privacy │
└──────────────────────────────────────┘
```

- **Headline de benefício** ("Stay covered all year"), não "Upgrade to Pro".
- **Benefícios em linguagem de resultado** (o que muda na vida do usuário), espelhando a Seção 11.
- **Plano anual destacado** com selo e a economia explícita; trial de 7 dias no anual.
- Implementado com **RevenueCat Paywall**; respeita o entitlement `pro`.
- Contexto de origem: se o usuário veio de uma feature específica (ex.: tocou em Deductions), a headline pode adaptar ("Unlock deductions and more").

---

## 9. Integração com IA

> Toda chamada de IA é **server-side**. A chave da OpenAI fica no backend. O app nunca embute a chave.

Referência oficial da API: https://platform.openai.com/docs — consulte para os detalhes atuais de modelos, function calling e da web search tool (os parâmetros podem mudar; verifique a doc na hora de implementar).

### 9.1 Job anual: atualizar o TaxConfig

**Endpoint:** `POST /ai/refresh-config` (rodar via cron no início de cada ano fiscal, ou sob demanda quando o app detecta `TaxConfig` expirado).

Lógica:

1. Chamar a API da OpenAI com o **web search tool habilitado**.
2. Prompt instrui a buscar **exclusivamente em irs.gov** os valores do ano fiscal alvo: standard deduction por filing status, brackets federais por filing status, Social Security wage base, thresholds de Additional Medicare, QBI threshold, e os 4 quarterly deadlines.
3. Instruir o modelo a **retornar apenas JSON** no formato do `TaxConfig` (sem prosa, sem markdown).
4. **Validar** o JSON retornado antes de salvar: checagens de sanidade (alíquotas entre 0 e 1, brackets monotônicos crescentes, wage base num intervalo plausível, deadlines no ano correto). Se a validação falhar, **não** sobrescrever o config vigente; logar e alertar.
5. Salvar `source_urls` retornadas para auditoria.

Modelo sugerido: um modelo da família atual (ex.: GPT-5) é suficiente para esta tarefa de extração estruturada. Como roda raramente (≈1×/ano + tentativas), custo é desprezível.

**Prompt-base do job (em inglês, para a API):**

```
You are a tax data extraction tool. Search ONLY official IRS sources
(domain irs.gov) for the United States federal tax parameters for tax
year {YEAR}. Find and return these values:

- Standard deduction for each filing status (single, married filing
  jointly, married filing separately, head of household)
- Federal income tax brackets for each filing status (lower bound,
  upper bound, rate)
- Social Security wage base limit
- Additional Medicare Tax thresholds per filing status
- QBI (Section 199A) taxable income thresholds per filing status
- The four estimated quarterly tax payment deadlines for {YEAR}

Return ONLY a valid JSON object matching this exact schema: {SCHEMA}.
Do not include any explanation, markdown, or text outside the JSON.
For every value, the source must be an irs.gov URL. Include all source
URLs in the source_urls array. If you cannot confirm a value from
irs.gov, set it to null — never guess.
```

> Estados: os parâmetros estaduais mudam menos e variam por estado. No MVP, manter o bloco `states` do `TaxConfig` curado manualmente (ou via job de IA análogo apontando para os sites das Departments of Revenue estaduais), começando pelos estados de maior volume de usuários. Validar com a mesma rigidez.

### 9.2 Q&A fiscal (Pro)

**Endpoint:** `POST /ai/ask`

- Recebe a pergunta do usuário + contexto numérico anonimizado (renda projetada, estado, filing status, total separado — **sem** nome, email ou identificadores).
- Chama a API da OpenAI com um system prompt que: (a) responde dúvidas fiscais gerais de freelancers dos EUA, (b) usa o contexto para personalizar, (c) **sempre** inclui o disclaimer de que é informação geral e não substitui um profissional, (d) recusa-se a dar conselho que dependa de circunstâncias que não conhece, recomendando um CPA.
- Aplicar rate limit por usuário.

### 9.3 Controle de custo

- O job anual roda ≈1×/ano → custo irrelevante.
- O Q&A é sob demanda e exclusivo do Pro → naturalmente limitado pela base paga + rate limit.
- **Não** é um app de chat contínuo; a IA é um recurso pontual. Custo de API previsível e baixo.

---

## 10. (reservado)

---

## 11. Gating Free vs. Pro

| Recurso                                | Free        | Pro                    |
| -------------------------------------- | ----------- | ---------------------- |
| Calculadora de set-aside por pagamento | ✓           | ✓                      |
| Fontes de renda                        | 1           | Ilimitadas             |
| Self-employment + federal tax          | ✓           | ✓                      |
| State income tax                       | ✗           | ✓                      |
| Deduções por categoria                 | ✗           | ✓                      |
| Histórico de pagamentos                | ✓ (simples) | ✓ (por fonte, filtros) |
| Lembretes de prazo trimestral          | ✓           | ✓                      |
| Safe harbor / valor protegido          | ✗           | ✓                      |
| Relatório PDF para contador            | ✗           | ✓                      |
| Q&A fiscal por IA                      | ✗           | ✓                      |
| Sync em nuvem                          | ✗           | ✓                      |

**Preço:**

- **Pro mensal:** $4,99/mês
- **Pro anual:** $39,99/ano (destacar "save 33%" / "~$3.33/mo")
- **Trial:** 7 dias grátis no anual (testar; pode aumentar conversão nesse nicho).

Racional do anual: o usuário pensa em ciclo fiscal anual, então pagar por ano faz sentido psicológico e reduz churn. A âncora de preço é favorável — um CPA custa $150–400/ano, o TurboTax Self-Employed $89–129. $39,99/ano é claramente mais barato e resolve um problema diferente (proativo).

Implementar tudo via **RevenueCat entitlements** (entitlement `pro`).

---

## 12. (reservado)

---

## 13. Requisitos legais e de App Store

- **Disclaimer obrigatório**, exibido no onboarding e acessível em Settings, e no rodapé de toda saída de IA: _"Taxnest provides estimates for planning purposes only. It is not tax, legal, or financial advice and does not replace a licensed tax professional."_
- **Não** prometer precisão ("guaranteed", "exact refund") em nenhuma copy — usar "estimate", "projection", "helps you plan".
- Política de privacidade pública (URL) e descrição honesta de coleta de dados (App Privacy "nutrition label" da App Store). Dados financeiros: declarar que ficam no dispositivo; sync é opt-in e criptografado.
- App Store category: Finance. Estar preparado para a possibilidade de a review pedir esclarecimentos sobre o disclaimer — tê-lo visível ajuda a passar.
- Sem coleta de dados sensíveis desnecessária. O Q&A envia contexto **anonimizado**.

---

## 14. Eventos de analytics

Instrumentar no mínimo:

- `onboarding_started`, `onboarding_completed` (com filing_status, state, income_band)
- `income_added` (amount_band, source_count, is_pro)
- `set_aside_shown` (effective_rate_band)
- `paywall_viewed` (trigger: qual feature)
- `trial_started`, `subscription_started` (plan: monthly/annual), `subscription_cancelled`
- `quarterly_reminder_sent`, `quarterly_marked_paid`
- `deduction_added` (category)
- `report_generated`
- `ai_question_asked` (is_pro)
- `pro_feature_blocked` (qual feature) — sinal de demanda de upgrade

Funil-chave a monitorar: onboarding_completed → income_added (ativação) → paywall_viewed → subscription_started.

---

## 15. Roadmap pós-MVP

Em ordem de prioridade sugerida:

1. **Android** (port React Native — lógica de negócio reaproveitada).
2. **Annualized installment method** — para renda muito irregular, calcular trimestres desiguais (mais preciso que dividir por 4).
3. **Itemized deductions** completas (vs. só standard deduction).
4. **Integração bancária (Plaid)** — importar pagamentos automaticamente em vez de digitar.
5. **Entidades** — suporte a LLC e S-Corp election (muda a lógica de SE tax).
6. **Multi-ano e comparativos** — dashboards ano a ano.
7. **Modo contador** — exportação/colaboração com o CPA do usuário.
8. **Expansão do bloco `states`** para cobertura completa dos 50 estados com regras detalhadas.

---

## 16. Critérios de "pronto" do MVP

O MVP está pronto para submeter à App Store quando:

- [ ] Onboarding completo cria perfil e baixa TaxConfig.
- [ ] Add income calcula e mostra set-aside marginal correto (validado por testes).
- [ ] Dashboard mostra total, projeção, próximo prazo e effective rate.
- [ ] SE tax, federal e (Pro) state tax batem com os casos de teste da Seção 6.8.
- [ ] Paywall funcional via RevenueCat com mensal e anual.
- [ ] Gating Free/Pro aplicado em todas as features da Seção 11.
- [ ] Lembretes push dos 4 prazos funcionando.
- [ ] Relatório PDF gerado corretamente (Pro).
- [ ] Q&A por IA respondendo com disclaimer (Pro).
- [ ] Job de TaxConfig por IA roda, valida e salva — com fallback seguro se a validação falhar.
- [ ] Disclaimers legais presentes (onboarding, settings, saídas de IA).
- [ ] Cobertura de testes do TaxEngine nos casos da Seção 6.8.
- [ ] App Privacy label preenchido honestamente.

---

### Apêndice A — Glossário fiscal (para a IA e para a copy)

- **Self-Employment Tax (SE tax):** 15.3% (12.4% Social Security + 2.9% Medicare) sobre 92.35% do lucro líquido. Cobre o que um CLT divide com o empregador.
- **Estimated Quarterly Taxes:** pagamentos trimestrais ao IRS porque não há retenção automática. Prazos: ~15 abr, 15 jun, 15 set, 15 jan.
- **Standard Deduction:** abatimento fixo do rendimento tributável conforme filing status.
- **QBI Deduction (Section 199A):** dedução de até 20% do lucro de negócio pass-through.
- **Safe Harbor:** pagar o menor entre 90% do imposto do ano corrente ou 100%/110% do ano anterior evita multa por subpagamento.
- **Filing Status:** single, married filing jointly, married filing separately, head of household.
- **AGI (Adjusted Gross Income):** renda após deduções "above the line".
- **Schedule C / Schedule SE:** formulários do sole proprietor para lucro do negócio e SE tax.

---

_Fim do PRD v1. Os valores fiscais são referência do ano-base 2025 e devem ser confirmados via a camada de IA contra irs.gov no momento da construção e a cada virada de ano._
