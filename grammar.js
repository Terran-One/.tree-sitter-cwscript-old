function csl(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

function block(kw, item_rule) {
  return seq(kw, "{", repeat(item_rule), "}");
}

module.exports = grammar({
  name: "cwscript",

  rules: {
    cwscript_src: ($) => repeat($._cws_item),
    _cws_item: ($) => choice($.contract_defn, $.interface_defn, $._import_stmt),

    contract_defn: ($) =>
      seq(
        field("spec", optional($._cwspec)),
        "contract",
        field("name", $.ident),
        field("bases", optional(seq("extends", $.ident_list))),
        field("interfaces", optional(seq("implements", $.ident_list))),
        "{",
        field("body", repeat($._contract_item)),
        "}"
      ),

    _cwspec: ($) => repeat1(choice($.cwspec_line, $.cwspec_block)),
    cwspec_line: ($) => seq("///", /[^\n]*/),
    cwspec_block: ($) => seq("/**", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),

    interface_defn: ($) =>
      seq(
        field("spec", optional($._cwspec)),
        "interface",
        field("name", $.ident),
        field("bases", optional(seq("extends", $.ident_list))),
        "{",
        field("body", repeat($._interface_item)),
        "}"
      ),

    _import_stmt: ($) => choice($.import_all, $.import_items),

    import_all: ($) =>
      seq("import", "*", "from", field("filepath", $.string_val)),

    import_items: ($) =>
      seq(
        "import",
        field("symbols", $.import_list),
        "from",
        field("filepath", $.string_val)
      ),

    import_list: ($) =>
      choice(
        seq("(", csl($.import_item), optional(","), ")"),
        csl($.import_item)
      ),

    import_item: ($) =>
      seq(
        field("symbol", $.ident),
        optional(seq("as", field("alias", $.ident)))
      ),

    _contract_item: ($) =>
      choice(
        block("error", $._enum_variant),
        block("event", $._enum_variant),
        block("state", $._state_defn),
        block("exec", $._named_fn_defn),
        block("query", $._named_fn_defn),
        $.error_defn,
        $.event_defn,
        $.state_defn,
        $.instantiate_defn,
        $.exec_defn,
        $.query_defn,
        $.migrate_defn,
        $._type_defn
      ),

    _interface_item: ($) =>
      choice(
        block("error", $._enum_variant),
        block("event", $._enum_variant),
        block("state", $._state_defn),
        block("exec", $._named_fn_decl),
        block("query", $._named_fn_decl),
        $.error_defn,
        $.event_defn,
        $.state_defn,
        $.instantiate_decl,
        $.exec_decl,
        $.query_decl,
        $.migrate_decl,
        $._type_defn
      ),

    error_defn: ($) =>
      seq(field("spec", optional($._cwspec)), "error", $._enum_variant),
    event_defn: ($) =>
      seq(field("spec", optional($._cwspec)), "event", $._enum_variant),
    state_defn: ($) =>
      seq(field("spec", optional($._cwspec)), "state", $._state_defn),

    _state_defn: ($) => choice($.state_item, $.state_map),
    state_defn: ($) =>
      seq(field("spec", optional($._cwspec)), "state", $._state_defn),
    state_item: ($) =>
      seq(
        field("spec", optional($._cwspec)),
        field("key", $.ident),
        ":",
        field("type", $._type_expr)
      ),
    state_map: ($) =>
      seq(
        field("spec", optional($._cwspec)),
        field("key", $.ident),
        repeat1($.map_key),
        ":",
        field("type", $._type_expr)
      ),
    map_key: ($) =>
      seq(
        "[",
        optional(seq(field("key_name", $.ident), ":")),
        field("key_type", $._type_expr),
        "]"
      ),

    _named_fn_defn: ($) =>
      seq(
        field("name", $.ident),
        field("args", $.fn_args),
        optional(field("return_type", $.fn_return_type)),
        field("body", $.fn_body)
      ),
    _fn_defn: ($) =>
      seq(
        field("args", $.fn_args),
        optional(field("return_type", $.fn_return_type)),
        field("body", $.fn_body)
      ),
    _named_fn_decl: ($) =>
      seq(
        field("name", $.ident),
        field("args", $.fn_args),
        optional(field("return_type", $.fn_return_type))
      ),
    _fn_decl: ($) =>
      seq(
        field("args", $.fn_args),
        optional(field("return_type", $.fn_return_type))
      ),

    instantiate_defn: ($) =>
      seq(field("spec", optional($._cwspec)), "instantiate", $._fn_defn),
    instantiate_decl: ($) =>
      seq(field("spec", optional($._cwspec)), "instantiate", $._fn_decl),
    exec_defn: ($) =>
      seq(field("spec", optional($._cwspec)), "exec", $._named_fn_defn),
    exec_decl: ($) =>
      seq(field("spec", optional($._cwspec)), "exec", $._named_fn_decl),
    query_defn: ($) =>
      seq(field("spec", optional($._cwspec)), "query", $._named_fn_defn),
    query_decl: ($) =>
      seq(field("spec", optional($._cwspec)), "query", $._named_fn_decl),
    migrate_defn: ($) =>
      seq(field("spec", optional($._cwspec)), "migrate", $._fn_defn),
    migrate_decl: ($) =>
      seq(field("spec", optional($._cwspec)), "migrate", $._fn_decl),

    fn_args: ($) => seq("(", optional(csl($.fn_arg)), ")"),
    fn_arg: ($) =>
      seq(
        field("name", $.ident),
        field("is_option", optional("?")),
        ":",
        field("type", $._type_expr)
      ),
    fn_return_type: ($) => seq("->", $._type_expr),
    fn_body: ($) => seq("{", repeat($._stmt), "}"),

    _stmt: ($) =>
      choice(
        prec(5, $.let_stmt),
        prec(4, $.assign_stmt),
        prec(4, $.if_stmt),
        prec(3, $.for_stmt),
        prec(2, $._directive_stmt),
        $._expr
      ),

    _expr: ($) =>
      choice(
        $.grouped_expr,
        $.member_access_expr,
        $.table_lookup_expr,
        $._fn_call_expr,
        $.unary_neg_expr,
        $.unary_not_expr,
        $.mult_div_mod_expr,
        $.add_sub_expr,
        $.comparison_expr,
        $.equality_expr,
        $.and_expr,
        $.or_expr,
        $.query_expr,
        $._val
      ),

    grouped_expr: ($) => prec(100, seq("(", $._expr, ")")),
    member_access_expr: ($) =>
      prec.left(90, seq(field("lhs", $._expr), ".", field("member", $.ident))),
    table_lookup_expr: ($) =>
      prec.left(
        90,
        seq(field("lhs", $._expr), "[", field("index", $._expr), "]")
      ),
    unary_neg_expr: ($) => prec.right(80, seq("-", field("arg", $._expr))),
    unary_not_expr: ($) => prec.right(80, seq("!", field("arg", $._expr))),
    mult_div_mod_expr: ($) =>
      prec.left(
        70,
        seq(
          field("lhs", $._expr),
          field("op", choice("*", "/", "%")),
          field("lhs", $._expr)
        )
      ),
    add_sub_expr: ($) =>
      prec.left(
        60,
        seq(
          field("lhs", $._expr),
          field("op", choice("+", "-")),
          field("rhs", $._expr)
        )
      ),
    comparison_expr: ($) =>
      prec.left(
        50,
        seq(
          field("lhs", $._expr),
          field("op", choice("<", ">", "<=", ">=")),
          field("rhs", $._expr)
        )
      ),
    equality_expr: ($) =>
      prec.left(
        40,
        seq(
          field("lhs", $._expr),
          field("op", choice("==", "!=")),
          field("rhs", $._expr)
        )
      ),
    and_expr: ($) =>
      prec.left(30, seq(field("lhs", $._expr), "and", field("rhs", $._expr))),
    or_expr: ($) =>
      prec.left(20, seq(field("lhs", $._expr), "or", field("lhs", $._expr))),
    query_expr: ($) => prec(10, seq("query", field("arg", $._expr))),

    _fn_call_expr: ($) =>
      choice($.pos_args_fn_call_expr, $.named_args_fn_call_expr),

    pos_args_fn_call_expr: ($) =>
      prec(85, seq(field("function", $._expr), field("args", $.pos_args))),
    pos_args: ($) => prec(85, seq("(", optional(csl($._expr)), ")")),
    named_args_fn_call_expr: ($) =>
      prec(90, seq(field("function", $._expr), field("args", $.named_args))),

    named_args: ($) => prec(90, seq("(", optional(csl($.named_arg)), ")")),
    named_arg: ($) => seq(field("name", $.ident), ":", field("value", $._expr)),

    _val: ($) =>
      choice(
        $.unit_val,
        $.struct_val,
        $.tuple_struct_val,
        $.vec_val,
        $.string_val,
        $.integer_val,
        $.decimal_val,
        $._bool_val,
        $.none_val,
        $.ident
      ),

    unit_val: ($) => "()",
    struct_val: ($) =>
      seq(
        field("type", $._type_expr),
        "{",
        optional(
          field(
            "members_vals",
            optional(seq(csl($.struct_val_member), optional(",")))
          )
        ),
        "}"
      ),
    struct_val_member: ($) =>
      seq(field("name", $.ident), ":", field("value", $._expr)),
    tuple_struct_val: ($) =>
      seq(
        field("type", $._type_expr),
        "(",
        optional(field("member_vals", csl($._expr))),
        ")"
      ),
    vec_val: ($) => seq("[", optional(field("vals", csl($._expr))), "]"),
    string_val: ($) => /"([^"\r\n\\]|(\\.))*"/,
    integer_val: ($) => /[0-9]+/,
    decimal_val: ($) => /[0-9]+\.[0-9]+/,
    _bool_val: ($) => choice("true", "false"),
    none_val: ($) => "none",

    _bindings: ($) => choice($.ident_binding, $.struct_unpack_binding),
    ident_binding: ($) =>
      seq(
        field("var_name", $.ident),
        optional(seq(":", field("type", $._type_expr)))
      ),
    struct_unpack_binding: ($) => seq("{", $.ident_list, "}"),

    let_stmt: ($) =>
      seq("let", field("bindings", $._bindings), "=", field("rhs", $._expr)),
    assign_stmt: ($) =>
      seq(
        field("lhs", $._expr),
        field("op", $.assign_op),
        field("rhs", $._expr)
      ),
    if_stmt: ($) =>
      seq(
        field("if_clause", $.if_clause),
        field("else_if_clauses", repeat($.else_if_clause)),
        field("else_clause", optional($.else_clause))
      ),

    if_clause: ($) =>
      seq("if", field("predicate", $._expr), field("body", $.fn_body)),
    else_if_clause: ($) => seq("else", $.if_clause),
    else_clause: ($) => seq("else", field("body", $.fn_body)),

    for_stmt: ($) =>
      seq(
        "for",
        field("bindings", $._bindings),
        "in",
        field("iterable", $._expr),
        field("body", $.fn_body)
      ),

    _directive_stmt: ($) =>
      choice($.exec_stmt, $.emit_stmt, $.return_stmt, $.fail_stmt),

    exec_stmt: ($) => seq("exec", field("arg", $._expr)),
    emit_stmt: ($) => seq("emit", field("arg", $._expr)),
    return_stmt: ($) => seq("return", field("arg", $._expr)),
    fail_stmt: ($) => seq("fail", field("arg", $._expr)),

    _enum_variant: ($) => choice($._enum_variant_struct, $._enum_variant_tuple),

    _enum_variant_struct: ($) =>
      prec(
        3,
        choice(
          seq(
            field("name", $.ident),
            choice(
              seq(
                "{",
                field(
                  "members",
                  optional(seq(csl($.struct_member), optional(",")))
                ),
                "}"
              ),
              seq("(", field("members", csl($.struct_member)), ")")
            )
          )
        )
      ),
    _enum_variant_tuple: ($) =>
      prec(
        2,
        seq(
          field("name", $.ident),
          "(",
          field("members", optional(seq(csl($._type_expr)))),
          ")"
        )
      ),

    type_name: ($) => /[A-Z][a-zA-Z0-9_]*/,
    ident: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    builtin_type: ($) =>
      choice(
        "bool",
        "i8",
        "i16",
        "i32",
        "i64",
        "i128",
        "u8",
        "u16",
        "u32",
        "u64",
        "u128",
        "byte"
      ),
    assign_op: ($) => choice("=", "+=", "-=", "*=", "/=", "%="),
    directive: ($) => choice("exec", "emit", "return", "fail"),
    ident_list: ($) => csl($.ident),
    struct_member: ($) =>
      seq(
        field("name", $.ident),
        field("is_option", optional("?")),
        ":",
        field("type", $._type_expr)
      ),

    tuple_type: ($) => seq("(", optional(csl($._type_expr)), ")"),
    short_option_type: ($) => prec.left(50, seq($._type_expr, "?")),
    short_vec_type: ($) => prec.left(50, seq($._type_expr, "[]")),
    _type_defn: ($) => choice($.struct_defn, $.enum_defn, $.type_alias_defn),
    struct_defn: ($) =>
      seq(
        field("spec", optional($._cwspec)),
        "struct",
        choice($._enum_variant_struct, $._enum_variant_tuple)
      ),
    struct_body: ($) =>
      seq("{", optional(seq(csl($.struct_member), optional(","))), "}"),
    enum_defn: ($) =>
      seq(
        field("spec", optional($._cwspec)),
        "enum",
        field("name", $.ident),
        $.enum_body
      ),
    enum_body: ($) =>
      seq(
        "{",
        repeat(seq(field("spec", optional($._cwspec)), $._enum_variant)),
        "}"
      ),
    type_alias_defn: ($) =>
      seq(
        field("spec", optional($._cwspec)),
        "type",
        field("name", $.type_name),
        "=",
        $._type_expr
      ),
    infer_type: ($) => "_",

    _type_expr: ($) =>
      choice(
        $.type_path,
        $.tuple_type,
        $.short_vec_type,
        $.short_option_type,
        $._type_defn,
        $.infer_type,
        $.builtin_type
      ),
    type_path: ($) => seq($.type_name, repeat(seq("::", $.ident))),
  },
});
