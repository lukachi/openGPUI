// One rendered OpenUI response: parser, $state store, queries and mutations,
// form state and validation, actions and errors. Framework-free port of
// @openuidev/react-lang's useOpenUIState / useOpenUIErrors / useFormValidation
// (MIT); nothing here touches gpui.
//
// The session never redraws by itself. It calls `onChange` when something a
// renderer shows may have changed; the host then calls `update()` from a live
// phase (a task or event handler) and redraws.
import {
  ACTION_STEPS,
  BuiltinActionType,
  createQueryManager,
  createStore,
  createStreamingParser,
  enrichErrors,
  evaluate,
  evaluateRoot,
  extractToolResult,
  isElementNode,
  resolveStateField,
  ToolNotFoundError,
  validate,
  type ActionEvent,
  type ActionPlan,
  type ElementNode,
  type EvaluationContext,
  type Library,
  type LibraryJSONSchema,
  type McpClientLike,
  type OpenUIError,
  type ParsedRule,
  type ParseResult,
  type QueryManager,
  type StateField,
  type Store,
  type StreamParser,
  type ToolProvider,
} from "@openuidev/lang-core";
import { diagramModel } from "../diagram/model.ts";
import { validateDiagram } from "../diagram/validate.ts";
import { sequenceModel, validateSequence } from "../diagram/sequence.ts";
import { timelineModel, validateTimeline } from "../diagram/timeline.ts";
import { parseResponseBundle, type ResponseBundle } from "./response.ts";

/** Query/Mutation tools: a map of async functions, or an MCP client. */
export type Tools = Record<string, (args: Record<string, unknown>) => Promise<unknown>> | McpClientLike;

/** An action as components fire it: a v0.5 plan, a legacy `{ type, params }`, or none. */
export type ActionInput = ActionPlan | { type?: string; params?: Record<string, unknown>; url?: string; context?: unknown };

export interface SessionOptions {
  /** A lang-core library: see `libraries` and `subsetLibrary`. */
  library: Required<Library>;
  tools?: Tools | null;
  /** continue_conversation, open_url, or a custom action's name. */
  onAction?: (event: ActionEvent) => void;
  /** The user changed $state or a form. */
  onStateUpdate?: (state: Record<string, unknown>) => void;
  /** LLM-friendly errors; [] once resolved. */
  onError?: (errors: OpenUIError[]) => void;
  /** `$name` bindings and form state to restore. */
  initialState?: Record<string, unknown>;
  /** Something shown may have changed: call update() from a live phase and redraw. */
  onChange?: () => void;
}

/** Unwrap a `{ value, componentType }` form field entry to its raw value. */
export function unwrapFieldValue(v: unknown): unknown {
  if (isRecord(v) && "value" in v) return v.value;
  return v;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** An MCP client has a callTool method; a function map whose tool is named "callTool" would read as one. */
function isMcpClient(input: Tools): input is McpClientLike {
  return "callTool" in input && typeof input.callTool === "function";
}

type McpEnvelope = Parameters<typeof extractToolResult>[0];

function toToolProvider(input: Tools | null | undefined): ToolProvider | null {
  if (input == null) return null;
  return {
    async callTool(toolName: string, args: Record<string, unknown>) {
      if (isMcpClient(input)) {
        // An MCP client answers with a tool-result envelope; extractToolResult unwraps it.
        const envelope = (await input.callTool({ name: toolName, arguments: args })) as McpEnvelope;
        return extractToolResult(envelope);
      }
      const fn = input[toolName];
      if (typeof fn !== "function") throw new ToolNotFoundError(toolName, Object.keys(input));
      return fn(args);
    },
  };
}

/** The diagram validators' problems (src/diagram/validate.ts, sequence.ts, timeline.ts) for every diagram in an evaluated tree. */
function diagramErrors(root: ElementNode | null): OpenUIError[] {
  const errors: OpenUIError[] = [];
  const seen = new Set<unknown>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (isElementNode(value) && !seen.has(value)) {
      seen.add(value);
      if (value.typeName === "Diagram") errors.push(...validateDiagram(diagramModel(value.props, false), value.statementId));
      else if (value.typeName === "Sequence") errors.push(...validateSequence(sequenceModel(value.props, false), value.statementId));
      else if (value.typeName === "Timeline") errors.push(...validateTimeline(timelineModel(value.props, false), value.statementId));
      else Object.values(value.props).forEach(walk);
    }
  };
  walk(root);
  return errors;
}

export interface FieldRegistration {
  rules: ParsedRule[];
  getValue: () => unknown;
}

/** Per-form validation registry, as react-lang's useCreateFormValidation keeps it. */
export class FormValidation {
  errors: Record<string, string | undefined> = {};
  fields: Record<string, FieldRegistration> = {};

  constructor(private readonly onChange: () => void) {}

  getFieldError(name: string): string | undefined {
    return this.errors[name];
  }

  private setError(name: string, error: string | undefined): void {
    if (this.errors[name] === error) return;
    this.errors = { ...this.errors, [name]: error };
    this.onChange();
  }

  validateField(name: string, value: unknown, rules: ParsedRule[]): boolean {
    const error = validate(value, rules);
    this.setError(name, error);
    return !error;
  }

  registerField(name: string, rules: ParsedRule[], getValue: () => unknown): void {
    this.fields[name] = { rules, getValue };
  }

  clearFieldError(name: string): void {
    this.setError(name, undefined);
  }

  validateForm(): boolean {
    let allValid = true;
    const next: Record<string, string | undefined> = {};
    for (const [name, reg] of Object.entries(this.fields)) {
      const error = validate(unwrapFieldValue(reg.getValue()), reg.rules);
      next[name] = error;
      if (error) allValid = false;
    }
    this.errors = next;
    this.onChange();
    return allValid;
  }
}

export class Session {
  readonly library: Required<Library>;
  readonly store: Store;
  readonly queryManager: QueryManager;
  readonly evaluationContext: EvaluationContext;
  onChange: () => void;

  /** The evaluated root element, or null before a response parses. */
  root: ElementNode | null = null;
  /** Current errors (empty while streaming). */
  errors: OpenUIError[] = [];

  private readonly options: SessionOptions;
  private readonly schema: LibraryJSONSchema;
  private readonly parser: StreamParser;
  private raw: string | null = null;
  private streaming = false;
  private bundle: ResponseBundle = parseResponseBundle(null, false);
  private result: ParseResult | null = null;
  private parseException: OpenUIError | null = null;
  private runtimeErrors: OpenUIError[] = [];
  private renderErrors: OpenUIError[] = [];
  private readonly forms = new Map<string, FormValidation>();
  private readonly dirty = { parse: true, queries: true, evaluate: true, errors: true };
  private initializing = false;
  private storeInitKey: string | null = null;
  private lastErrorKey = "";
  private disposed = false;
  private readonly unsubscribe: (() => void)[];

  constructor(options: SessionOptions) {
    this.options = options;
    this.library = options.library;
    this.onChange = options.onChange ?? (() => {});
    this.schema = this.library.toJSONSchema();
    this.parser = createStreamingParser(this.schema, this.library.root);

    const functions = Object.fromEntries(
      Object.entries(this.schema.functions ?? {}).flatMap(([name, s]) => {
        const fn = this.library.functions?.[name]?.fn;
        return fn ? [[name, { ...s, fn }]] : [];
      }),
    );

    this.store = createStore();
    this.queryManager = createQueryManager(toToolProvider(options.tools));
    this.queryManager.activate();
    this.evaluationContext = {
      getState: (name: string) => unwrapFieldValue(this.store.get(name)),
      resolveRef: (name: string) => this.queryManager.getMutationResult(name) ?? this.queryManager.getResult(name),
      functions,
      actions: this.schema.actions,
    };

    this.unsubscribe = [
      this.store.subscribe(() => {
        this.dirty.queries = true;
        this.dirty.evaluate = true;
        if (!this.initializing) this.options.onStateUpdate?.(this.store.getSnapshot());
        this.onChange();
      }),
      this.queryManager.subscribe(() => {
        this.dirty.evaluate = true;
        this.onChange();
      }),
    ];
  }

  /** New response text. `streaming` stays true until the model has finished writing it. */
  setResponse(raw: string | null, streaming = false): void {
    if (raw === this.raw && streaming === this.streaming) return;
    this.raw = raw;
    this.streaming = streaming;
    this.revision++;
    this.dirty.parse = true;
    this.onChange();
  }

  /** Counts setResponse() changes: a new value means new response text (a streamed chunk). */
  revision = 0;

  /** True while the model is still writing the response (not merely incomplete or invalid). */
  get isStreaming(): boolean {
    return this.streaming;
  }

  /** True while the response is incomplete: inputs wait and actions are held back. */
  get blocked(): boolean {
    return this.streaming || !this.bundle.complete || !!this.bundle.error;
  }

  get isQueryLoading(): boolean {
    const snapshot = this.queryManager.getSnapshot();
    return (
      snapshot.__openui_loading.length > 0 ||
      (this.streaming && this.bundle.isBundle && this.blocked && (this.result?.queryStatements.length ?? 0) > 0)
    );
  }

  get queryErrors(): OpenUIError[] {
    return this.queryManager.getSnapshot().__openui_errors.filter((e) => e.source === "query");
  }

  retryQueries(): void {
    if (this.bundle.isBundle && this.blocked) return;
    this.queryManager.invalidate(this.queryErrors.flatMap((e) => (e.statementId ? [e.statementId] : [])));
  }

  /**
   * Bring parse, store, queries and the evaluated tree up to date. Call from a
   * live phase: query refresh timers may be created here.
   */
  update(): void {
    if (this.disposed) return;
    if (this.dirty.parse) {
      this.dirty.parse = false;
      this.parse();
      this.dirty.queries = true;
      this.dirty.evaluate = true;
    }
    if (this.dirty.queries) {
      this.dirty.queries = false;
      this.runQueries();
    }
    if (this.dirty.evaluate) {
      this.dirty.evaluate = false;
      this.dirty.errors = true;
      this.evaluate();
    }
    if (this.dirty.errors) {
      this.dirty.errors = false;
      this.collectErrors();
    }
  }

  private parse(): void {
    this.bundle = parseResponseBundle(this.raw, this.streaming);
    this.parseException = this.bundle.error ? { source: "parser", code: "parse-failed", message: this.bundle.error } : null;
    if (!this.bundle.program) {
      this.result = null;
      return;
    }
    try {
      this.result = this.parser.set(this.bundle.program, !this.streaming);
    } catch (e) {
      this.parseException = {
        source: "parser",
        code: "parse-exception",
        message: `Parser crashed: ${e instanceof Error ? e.message : String(e)}`,
        hint: "The response may contain syntax the parser cannot handle",
      };
      this.result = null;
    }
    this.initializeStore();
  }

  private initializeStore(): void {
    const decls = this.result?.stateDeclarations;
    const initial = this.options.initialState;
    if (!decls && !initial) return;
    const key = `${JSON.stringify(decls)}::${JSON.stringify(initial)}`;
    if (this.storeInitKey === key) return;
    this.storeInitKey = key;
    // $-prefixed keys are bindings; everything else is form state, restored as is.
    const bindingDefaults: Record<string, unknown> = {};
    this.initializing = true;
    try {
      for (const [k, v] of Object.entries(initial ?? {})) {
        if (k.startsWith("$")) bindingDefaults[k] = v;
        else this.store.set(k, v);
      }
      this.store.initialize(decls ?? {}, bindingDefaults);
    } finally {
      this.initializing = false;
    }
  }

  private runQueries(): void {
    if (this.blocked) return;
    this.queryManager.evaluateStatements(this.result?.queryStatements ?? [], this.evaluationContext);
    const nodes = (this.result?.mutationStatements ?? []).map((m) => ({
      statementId: m.statementId,
      toolName: m.toolAST ? (evaluate(m.toolAST, this.evaluationContext) as string) : "",
    }));
    this.queryManager.registerMutations(nodes);
  }

  private evaluate(): void {
    this.runtimeErrors = [];
    const result = this.result;
    if (!result?.root && !result?.rootExpression) {
      this.root = result?.root ?? null;
      return;
    }
    const evalCtx = { ctx: this.evaluationContext, library: this.library, store: this.store, errors: this.runtimeErrors };
    try {
      this.root = evaluateRoot(result, evalCtx);
    } catch (e) {
      this.runtimeErrors.push({
        source: "runtime",
        code: "runtime-error",
        message: `Prop evaluation failed: ${e instanceof Error ? e.message : String(e)}`,
      });
      this.root = result.root;
    }
  }

  /**
   * A renderer failed to draw a component; reported with the next update. This
   * does not call onChange: a component that always fails would redraw forever.
   */
  reportRenderError(error: OpenUIError): void {
    if (this.streaming) return;
    this.renderErrors.push(error);
    this.dirty.errors = true;
  }

  private collectErrors(): void {
    if (this.streaming) {
      this.errors = [];
      if (this.lastErrorKey !== "") {
        this.lastErrorKey = "";
        this.options.onError?.([]);
      }
      return;
    }
    const errors: OpenUIError[] = [];
    if (this.parseException) errors.push(this.parseException);
    if (this.bundle.program && !this.result?.meta.statementCount && !this.parseException) {
      errors.push({
        source: "parser",
        code: "parse-failed",
        message: "Response could not be parsed as valid openui-lang",
        hint: `The entire response must be valid openui-lang code starting with root = ${this.library.root ?? "Root"}(...)`,
      });
    }
    if (this.result?.meta.errors.length) {
      errors.push(...enrichErrors(this.result.meta.errors, this.schema, Object.keys(this.library.components)));
    }
    errors.push(...this.runtimeErrors, ...diagramErrors(this.root), ...this.renderErrors);
    this.renderErrors = [];
    errors.push(...(this.queryManager.getSnapshot().__openui_errors ?? []));
    this.errors = errors;
    const key = JSON.stringify(errors);
    if (key === this.lastErrorKey) return;
    this.lastErrorKey = key;
    this.options.onError?.(errors);
  }

  // ── Form state ──

  getFieldValue(formName: string | undefined, name: string): unknown {
    if (!formName) return unwrapFieldValue(this.store.get(name));
    const data = this.store.get(formName);
    return isRecord(data) ? unwrapFieldValue(data[name]) : undefined;
  }

  /**
   * Text inputs pass persist=false while typing and true on blur; discrete
   * inputs (select, checkbox, …) always persist.
   */
  setFieldValue(formName: string | undefined, componentType: string | undefined, name: string, value: unknown, persist = true): void {
    const wrapped = { value, componentType };
    if (!formName) {
      this.store.set(name, wrapped);
    } else {
      const raw = this.store.get(formName);
      this.store.set(formName, { ...(isRecord(raw) ? raw : {}), [name]: wrapped });
    }
    if (persist) this.options.onStateUpdate?.(this.store.getSnapshot());
  }

  /**
   * A field's value and setter: bound to a `$variable` when the prop is a
   * reactive binding, else stored under its name in the enclosing form.
   */
  stateField<T = unknown>(formName: string | undefined, name: string, binding: unknown): StateField<T> {
    return resolveStateField<T>(
      name,
      binding,
      this.store,
      this.evaluationContext,
      (field) => this.getFieldValue(formName, field),
      (field, next) => this.setFieldValue(formName, undefined, field, next),
    );
  }

  /** The validation registry of the form named `formName`. */
  form(formName: string): FormValidation {
    let form = this.forms.get(formName);
    if (!form) {
      form = new FormValidation(() => this.onChange());
      this.forms.set(formName, form);
    }
    return form;
  }

  private formPayload(formName: string | undefined): Record<string, unknown> {
    if (formName) {
      const raw = this.store.get(formName);
      if (isRecord(raw)) return { [formName]: raw };
    }
    return this.store.getSnapshot();
  }

  // ── Actions ──

  /**
   * Run an action: an ActionPlan (v0.5 steps), a legacy `{ type, params }`
   * config, or nothing (continue the conversation with `label`).
   */
  async triggerAction(label: string, formName: string | undefined, action?: ActionInput | null): Promise<void> {
    if (this.bundle.isBundle && this.blocked) return;
    const emit = (event: ActionEvent) => this.options.onAction?.(event);

    if (action && !("steps" in action)) {
      const type = action.type || BuiltinActionType.ContinueConversation;
      // Only a real call delivers a custom action; a legacy object cannot pose as one.
      if (this.schema.actions && Object.prototype.hasOwnProperty.call(this.schema.actions, type)) return;
      const params: Record<string, unknown> = { ...(action.params || {}) };
      if (action.url) params.url = action.url;
      if (action.context) params.context = action.context;
      emit({ type, params, humanFriendlyMessage: label, formState: this.formPayload(formName), formName });
      return;
    }

    if (action?.steps) {
      for (const step of action.steps) {
        switch (step.type) {
          case ACTION_STEPS.Run: {
            if (step.refType === "mutation") {
              const m = this.result?.mutationStatements?.find((s) => s.statementId === step.statementId);
              const args = m?.argsAST ? (evaluate(m.argsAST, this.evaluationContext) as Record<string, unknown>) : {};
              if (!(await this.queryManager.fireMutation(step.statementId, args))) return;
            } else {
              this.queryManager.invalidate([step.statementId]);
            }
            break;
          }
          case ACTION_STEPS.ToAssistant:
            emit({
              type: BuiltinActionType.ContinueConversation,
              params: step.context !== undefined ? { context: step.context } : {},
              humanFriendlyMessage: step.message,
              formState: this.formPayload(formName),
              formName,
            });
            break;
          case ACTION_STEPS.OpenUrl:
            emit({
              type: BuiltinActionType.OpenUrl,
              params: { url: step.url },
              humanFriendlyMessage: "",
              formState: this.formPayload(formName),
              formName,
            });
            break;
          case "custom_action":
            emit({ type: step.name, params: step.params, humanFriendlyMessage: "", formState: this.formPayload(formName), formName });
            break;
          case ACTION_STEPS.Set:
            if (step.valueAST) this.store.set(step.target, evaluate(step.valueAST, this.evaluationContext));
            break;
          case ACTION_STEPS.Reset: {
            const decls = this.result?.stateDeclarations ?? {};
            for (const target of step.targets) this.store.set(target, decls[target] ?? null, { pristine: true });
            break;
          }
        }
      }
      return;
    }

    emit({
      type: BuiltinActionType.ContinueConversation,
      params: {},
      humanFriendlyMessage: label,
      formState: this.formPayload(formName),
      formName,
    });
  }

  dispose(): void {
    this.disposed = true;
    for (const off of this.unsubscribe) off();
    this.queryManager.dispose();
    this.store.dispose();
  }
}
