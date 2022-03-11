function csl(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

function prefix(start, rule) {
  return seq(start, rule);
}

function block(kw, item_rule) {
  return seq(kw, "{", repeat(item_rule), "}");
}

function prefix(start, ...elements) {
  return seq(start, ...elements);
}

function cdr(...elements) {
  return seq(...elements);
}

module.exports = grammar({
  name: "cwscript",

  rules: {
    cwscript_src: ($) => repeat($._cws_item),
    _cws_item: ($) => choice($.contract_defn),

    contract_defn: ($) =>
      seq(
        "contract",
        field("name", $.ident),
        field("bases", optional(seq("extends", $.ident_list))),
        field("interfaces", optional(seq("implements", $.ident_list))),
        "{",
        field("body", repeat($._contract_item)),
        "}"
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
        $.migrate_defn
      ),

    error_defn: ($) => seq("error", $._enum_variant),
    event_defn: ($) => seq("event", $._enum_variant),
    state_defn: ($) => seq("state", $._enum_variant),

    _state_defn: ($) => choice($.state_item, $.state_map),
    state_defn: ($) => seq("state", $._state_defn),
    state_item: ($) =>
      seq(field("key", $.ident), ":", field("type", $._type_expr)),
    state_map: ($) =>
      seq(
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

    instantiate_defn: ($) => seq("instantiate", $._fn_defn),
    exec_defn: ($) => seq("exec", $._named_fn_defn),
    query_defn: ($) => seq("query", $._named_fn_defn),
    migrate_defn: ($) => seq("migrate", $._fn_defn),

    fn_args: ($) => seq("(", repeat($.fn_arg), ")"),
    fn_arg: ($) =>
      seq(field("name", $.ident), ":", field("type", $._type_expr)),
    fn_return_type: ($) => seq("->", $._type_expr),
    fn_body: ($) => seq("{", repeat($._stmt), "}"),

    _stmt: ($) =>
      choice(
        $.let_stmt,
        $.assign_stmt,
        $.if_stmt,
        $.for_stmt,
        $._directive_stmt
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
      prec(85, seq($._expr, "(", optional(csl($._expr)), ")")),
    named_args_fn_call_expr: ($) =>
      prec(90, seq($._expr, "(", optional(csl($.named_call_arg)), ")")),

    named_call_arg: ($) =>
      seq(field("name", $.ident), ":", field("value", $._expr)),

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
        optional(field("members_vals", csl($.struct_val_member))),
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
    struct_unpack_binding: ($) => seq("{", csl($.ident_binding), "}"),

    let_stmt: ($) =>
      seq("let", field("bindings", $._bindings), "=", $._expr, $.fn_body),
    assign_stmt: ($) => seq($._expr, field("op", $.assign_op), $._expr),
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
      seq("for", field("bindings", $._bindings), "in", $._expr, $.fn_body),
    _directive_stmt: ($) =>
      choice($.exec_stmt, $.emit_stmt, $.return_stmt, $.fail_stmt),

    exec_stmt: ($) => seq("exec", field("arg", $._expr)),
    emit_stmt: ($) => seq("emit", field("arg", $._expr)),
    return_stmt: ($) => seq("return", field("arg", $._expr)),
    fail_stmt: ($) => seq("fail", field("arg", $._expr)),

    _enum_variant: ($) =>
      choice($.enum_variant_struct, $.enum_variant_tuple, $.enum_variant_unit),

    enum_variant_struct: ($) =>
      choice(
        seq(
          field("name", $.ident),
          "{",
          field("members", optional(csl($.struct_member))),
          "}"
        ),
        seq(field("name", $.ident), "(", csl($.struct_member), ")")
      ),
    enum_variant_tuple: ($) =>
      seq(
        field("name", $.ident),
        "(",
        field("members", optional(repeat($._type_expr))),
        ")"
      ),
    enum_variant_unit: ($) => seq(field("name", $.ident)),

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
      seq(field("name", $.ident), ":", field("type", $._type_expr)),

    tuple_type: ($) => seq("(", optional(csl($._type_expr)), ")"),
    short_option_type: ($) => prec.left(50, seq($._type_expr, "?")),
    short_vec_type: ($) => prec.left(50, seq($._type_expr, "[]")),
    _type_defn: ($) => choice($.struct_defn, $.enum_defn, $.type_alias_defn),
    struct_defn: ($) => seq("struct", field("name", $.ident), $.struct_body),
    struct_body: ($) => seq("{", repeat($.struct_member), "}"),
    enum_defn: ($) => seq("enum", field("name", $.ident), $.enum_body),
    enum_body: ($) => seq("{", repeat($._enum_variant), "}"),
    type_alias_defn: ($) =>
      seq("type", field("name", $.type_name), "=", $._type_expr),
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
