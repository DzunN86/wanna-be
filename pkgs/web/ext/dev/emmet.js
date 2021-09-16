// node_modules/emmet-monaco-es/dist/emmet-monaco.esm.js
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
var __assign = function () {
    __assign = Object.assign || function __assign3(t2) {
        var arguments$1 = arguments;
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments$1[i];
            for (var p2 in s) {
                if (Object.prototype.hasOwnProperty.call(s, p2)) {
                    t2[p2] = s[p2];
                }
            }
        }
        return t2;
    };
    return __assign.apply(this, arguments);
};
var StreamReader = function StreamReader2(string, start, end) {
    if (end == null && typeof string === "string") {
        end = string.length;
    }
    this.string = string;
    this.pos = this.start = start || 0;
    this.end = end;
};
StreamReader.prototype.eof = function eof() {
    return this.pos >= this.end;
};
StreamReader.prototype.limit = function limit(start, end) {
    return new this.constructor(this.string, start, end);
};
StreamReader.prototype.peek = function peek() {
    return this.string.charCodeAt(this.pos);
};
StreamReader.prototype.next = function next() {
    if (this.pos < this.string.length) {
        return this.string.charCodeAt(this.pos++);
    }
};
StreamReader.prototype.eat = function eat(match) {
    var ch = this.peek();
    var ok = typeof match === "function" ? match(ch) : ch === match;
    if (ok) {
        this.next();
    }
    return ok;
};
StreamReader.prototype.eatWhile = function eatWhile(match) {
    var start = this.pos;
    while (!this.eof() && this.eat(match)) {
    }
    return this.pos !== start;
};
StreamReader.prototype.backUp = function backUp(n) {
    this.pos -= n || 1;
};
StreamReader.prototype.current = function current() {
    return this.substring(this.start, this.pos);
};
StreamReader.prototype.substring = function substring(start, end) {
    return this.string.slice(start, end);
};
StreamReader.prototype.error = function error(message) {
    var err = new Error(message + " at char " + (this.pos + 1));
    err.originalMessage = message;
    err.pos = this.pos;
    err.string = this.string;
    return err;
};
var SINGLE_QUOTE = 39;
var DOUBLE_QUOTE = 34;
var defaultOptions = {
    escape: 92,
    throws: false
};
var eatQuoted = function (stream, options) {
    options = options ? Object.assign({}, defaultOptions, options) : defaultOptions;
    var start = stream.pos;
    var quote = stream.peek();
    if (stream.eat(isQuote)) {
        while (!stream.eof()) {
            switch (stream.next()) {
                case quote:
                    stream.start = start;
                    return true;
                case options.escape:
                    stream.next();
                    break;
            }
        }
        stream.pos = start;
        if (options.throws) {
            throw stream.error("Unable to consume quoted string");
        }
    }
    return false;
};
function isQuote(code) {
    return code === SINGLE_QUOTE || code === DOUBLE_QUOTE;
}
function isNumber(code) {
    return code > 47 && code < 58;
}
function isAlpha(code, from, to2) {
    from = from || 65;
    to2 = to2 || 90;
    code &= ~32;
    return code >= from && code <= to2;
}
function isAlphaNumeric(code) {
    return isNumber(code) || isAlpha(code);
}
function isWhiteSpace(code) {
    return code === 32 || code === 9 || code === 160;
}
function isSpace(code) {
    return isWhiteSpace(code) || code === 10 || code === 13;
}
var DOLLAR = 36;
var COLON = 58;
var ESCAPE = 92;
var OPEN_BRACE = 123;
var CLOSE_BRACE = 125;
function parse(string) {
    var stream = new StreamReader(string);
    var fields = [];
    var cleanString = "", offset = 0, pos2 = 0;
    var code, field;
    while (!stream.eof()) {
        code = stream.peek();
        pos2 = stream.pos;
        if (code === ESCAPE) {
            stream.next();
            stream.next();
        } else if (field = consumeField(stream, cleanString.length + pos2 - offset)) {
            fields.push(field);
            cleanString += stream.string.slice(offset, pos2) + field.placeholder;
            offset = stream.pos;
        } else {
            stream.next();
        }
    }
    return new FieldString(cleanString + stream.string.slice(offset), fields);
}
function mark(string, fields, token) {
    token = token || createToken;
    var ordered = fields.map(function (field, order) {
        return { order, field, end: field.location + field.length };
    }).sort(function (a2, b2) {
        return a2.end - b2.end || a2.order - b2.order;
    });
    var offset = 0;
    var result = ordered.map(function (item) {
        var placeholder2 = string.substr(item.field.location, item.field.length);
        var prefix = string.slice(offset, item.field.location);
        offset = item.end;
        return prefix + token(item.field.index, placeholder2);
    });
    return result.join("") + string.slice(offset);
}
function createToken(index2, placeholder2) {
    return placeholder2 ? "${" + index2 + ":" + placeholder2 + "}" : "${" + index2 + "}";
}
function consumeField(stream, location) {
    var start = stream.pos;
    if (stream.eat(DOLLAR)) {
        var index2 = consumeIndex(stream);
        var placeholder2 = "";
        if (index2 != null) {
            return new Field(index2, placeholder2, location);
        }
        if (stream.eat(OPEN_BRACE)) {
            index2 = consumeIndex(stream);
            if (index2 != null) {
                if (stream.eat(COLON)) {
                    placeholder2 = consumePlaceholder(stream);
                }
                if (stream.eat(CLOSE_BRACE)) {
                    return new Field(index2, placeholder2, location);
                }
            }
        }
    }
    stream.pos = start;
}
function consumePlaceholder(stream) {
    var code;
    var stack = [];
    stream.start = stream.pos;
    while (!stream.eof()) {
        code = stream.peek();
        if (code === OPEN_BRACE) {
            stack.push(stream.pos);
        } else if (code === CLOSE_BRACE) {
            if (!stack.length) {
                break;
            }
            stack.pop();
        }
        stream.next();
    }
    if (stack.length) {
        throw stream.error('Unable to find matching "}" for curly brace at ' + stack.pop());
    }
    return stream.current();
}
function consumeIndex(stream) {
    stream.start = stream.pos;
    if (stream.eatWhile(isNumber)) {
        return Number(stream.current());
    }
}
var Field = function Field2(index2, placeholder2, location) {
    this.index = index2;
    this.placeholder = placeholder2;
    this.location = location;
    this.length = this.placeholder.length;
};
var FieldString = function FieldString2(string, fields) {
    this.string = string;
    this.fields = fields;
};
FieldString.prototype.mark = function mark$1(token) {
    return mark(this.string, this.fields, token);
};
FieldString.prototype.toString = function toString() {
    return this.string;
};
var defaultFieldsRenderer = function (text) {
    return text;
};
var OutputNode = function OutputNode2(node, fieldsRenderer, options) {
    if (typeof fieldsRenderer === "object") {
        options = fieldsRenderer;
        fieldsRenderer = null;
    }
    this.node = node;
    this._fieldsRenderer = fieldsRenderer || defaultFieldsRenderer;
    this.open = null;
    this.beforeOpen = "";
    this.afterOpen = "";
    this.close = null;
    this.beforeClose = "";
    this.afterClose = "";
    this.text = null;
    this.beforeText = "";
    this.afterText = "";
    this.indent = "";
    this.newline = "";
    if (options) {
        Object.assign(this, options);
    }
};
OutputNode.prototype.clone = function clone() {
    return new this.constructor(this.node, this);
};
OutputNode.prototype.indentText = function indentText(text) {
    var this$1 = this;
    var lines = splitByLines(text);
    if (lines.length === 1) {
        return text;
    }
    var nl = !this.newline && !this.indent ? " " : this.newline;
    return lines.map(function (line, i) {
        return i ? this$1.indent + line : line;
    }).join(nl);
};
OutputNode.prototype.renderFields = function renderFields(text) {
    return this._fieldsRenderer(text);
};
OutputNode.prototype.toString = function toString(children) {
    var open = this._wrap(this.open, this.beforeOpen, this.afterOpen);
    var close = this._wrap(this.close, this.beforeClose, this.afterClose);
    var text = this._wrap(this.text, this.beforeText, this.afterText);
    return open + text + (children != null ? children : "") + close;
};
OutputNode.prototype._wrap = function _wrap(str2, before, after) {
    before = before != null ? before : "";
    after = after != null ? after : "";
    if (str2 != null) {
        str2 = before ? str2.replace(/^\s+/, "") : str2;
        str2 = after ? str2.replace(/\s+$/, "") : str2;
        return before + this.indentText(str2) + after;
    }
    return "";
};
function splitByLines(text) {
    return (text || "").split(/\r\n|\r|\n/g);
}
var defaultField = function (index2, placeholder2) {
    return placeholder2 || "";
};
function render(tree, field, formatter) {
    if (typeof formatter === "undefined") {
        formatter = field;
        field = null;
    }
    field = field || defaultField;
    var fieldState = { index: 1 };
    var fieldsRenderer = function (text) {
        return text == null ? field(fieldState.index++) : getFieldsModel(text, fieldState).mark(field);
    };
    return run(tree.children, formatter, fieldsRenderer);
}
function run(nodes, formatter, fieldsRenderer) {
    return nodes.map(function (node) {
        var outNode = formatter(new OutputNode(node, fieldsRenderer));
        return outNode ? outNode.toString(run(node.children, formatter, fieldsRenderer)) : "";
    }).join("");
}
function getFieldsModel(text, fieldState) {
    var model = typeof text === "object" ? text : parse(text);
    var largestIndex = -1;
    model.fields.forEach(function (field) {
        field.index += fieldState.index;
        if (field.index > largestIndex) {
            largestIndex = field.index;
        }
    });
    if (largestIndex !== -1) {
        fieldState.index = largestIndex + 1;
    }
    return model;
}
var reProperty = /^([a-z-]+)(?:\s*:\s*([^\n\r]+))?$/;
var CSSSnippet = function CSSSnippet2(key, value) {
    this.key = key;
    this.value = value;
    this.property = null;
    var m2 = value && value.match(reProperty);
    if (m2) {
        this.property = m2[1];
        this.value = m2[2];
    }
    this.dependencies = [];
};
var prototypeAccessors = { defaultValue: { configurable: true } };
CSSSnippet.prototype.addDependency = function addDependency(dep) {
    this.dependencies.push(dep);
};
prototypeAccessors.defaultValue.get = function () {
    return this.value != null ? splitValue(this.value)[0] : null;
};
CSSSnippet.prototype.keywords = function keywords() {
    var stack = [];
    var keywords2 = new Set();
    var i = 0, item, candidates;
    if (this.property) {
        stack.push(this);
    }
    while (i < stack.length) {
        item = stack[i++];
        if (item.value) {
            candidates = splitValue(item.value).filter(isKeyword);
            for (var j = 0; j < candidates.length; j++) {
                keywords2.add(candidates[j].trim());
            }
            for (var j$1 = 0, deps = item.dependencies; j$1 < deps.length; j$1++) {
                if (stack.indexOf(deps[j$1]) === -1) {
                    stack.push(deps[j$1]);
                }
            }
        }
    }
    return Array.from(keywords2);
};
Object.defineProperties(CSSSnippet.prototype, prototypeAccessors);
function isKeyword(str2) {
    return /^\s*[\w-]+/.test(str2);
}
function splitValue(value) {
    return String(value).split("|");
}
var ac = "align-content:start|end|flex-start|flex-end|center|space-between|space-around|stretch|space-evenly";
var ai = "align-items:start|end|flex-start|flex-end|center|baseline|stretch";
var anim = "animation:${1:name} ${2:duration} ${3:timing-function} ${4:delay} ${5:iteration-count} ${6:direction} ${7:fill-mode}";
var animdel = "animation-delay:${1:time}";
var animdir = "animation-direction:normal|reverse|alternate|alternate-reverse";
var animdur = "animation-duration:${1:0}s";
var animfm = "animation-fill-mode:both|forwards|backwards";
var animic = "animation-iteration-count:1|infinite";
var animn = "animation-name";
var animps = "animation-play-state:running|paused";
var animtf = "animation-timing-function:linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier(${1:0.1}, ${2:0.7}, ${3:1.0}, ${3:0.1})";
var ap = "appearance:none";
var as = "align-self:start|end|auto|flex-start|flex-end|center|baseline|stretch";
var b = "bottom";
var bd = "border:${1:1px} ${2:solid} ${3:#000}";
var bdb = "border-bottom:${1:1px} ${2:solid} ${3:#000}";
var bdbc = "border-bottom-color:${1:#000}";
var bdbi = "border-bottom-image:url(${0})";
var bdbk = "border-break:close";
var bdbli = "border-bottom-left-image:url(${0})|continue";
var bdblrs = "border-bottom-left-radius";
var bdbri = "border-bottom-right-image:url(${0})|continue";
var bdbrrs = "border-bottom-right-radius";
var bdbs = "border-bottom-style";
var bdbw = "border-bottom-width";
var bdc = "border-color:${1:#000}";
var bdci = "border-corner-image:url(${0})|continue";
var bdcl = "border-collapse:collapse|separate";
var bdf = "border-fit:repeat|clip|scale|stretch|overwrite|overflow|space";
var bdi = "border-image:url(${0})";
var bdl = "border-left:${1:1px} ${2:solid} ${3:#000}";
var bdlc = "border-left-color:${1:#000}";
var bdlen = "border-length";
var bdli = "border-left-image:url(${0})";
var bdls = "border-left-style";
var bdlw = "border-left-width";
var bdr = "border-right:${1:1px} ${2:solid} ${3:#000}";
var bdrc = "border-right-color:${1:#000}";
var bdri = "border-right-image:url(${0})";
var bdrs = "border-radius";
var bdrst = "border-right-style";
var bdrw = "border-right-width";
var bds = "border-style:none|hidden|dotted|dashed|solid|double|dot-dash|dot-dot-dash|wave|groove|ridge|inset|outset";
var bdsp = "border-spacing";
var bdt = "border-top:${1:1px} ${2:solid} ${3:#000}";
var bdtc = "border-top-color:${1:#000}";
var bdti = "border-top-image:url(${0})";
var bdtli = "border-top-left-image:url(${0})|continue";
var bdtlrs = "border-top-left-radius";
var bdtri = "border-top-right-image:url(${0})|continue";
var bdtrrs = "border-top-right-radius";
var bdts = "border-top-style";
var bdtw = "border-top-width";
var bdw = "border-width";
var bfv = "backface-visibility:hidden|visible";
var bg = "background:${1:#000}";
var bga = "background-attachment:fixed|scroll";
var bgbk = "background-break:bounding-box|each-box|continuous";
var bgc = "background-color:#${1:fff}";
var bgcp = "background-clip:padding-box|border-box|content-box|no-clip";
var bgi = "background-image:url(${0})";
var bgo = "background-origin:padding-box|border-box|content-box";
var bgp = "background-position:${1:0} ${2:0}";
var bgpx = "background-position-x";
var bgpy = "background-position-y";
var bgr = "background-repeat:no-repeat|repeat-x|repeat-y|space|round";
var bgsz = "background-size:contain|cover";
var bxsh = "box-shadow:${1:inset }${2:hoff} ${3:voff} ${4:blur} ${5:#000}|none";
var bxsz = "box-sizing:border-box|content-box|border-box";
var c = "color:${1:#000}";
var cl = "clear:both|left|right|none";
var cm = "/* ${0} */";
var cnt = "content:'${0}'|normal|open-quote|no-open-quote|close-quote|no-close-quote|attr(${0})|counter(${0})|counters({$0})";
var coi = "counter-increment";
var colm = "columns";
var colmc = "column-count";
var colmf = "column-fill";
var colmg = "column-gap";
var colmr = "column-rule";
var colmrc = "column-rule-color";
var colmrs = "column-rule-style";
var colmrw = "column-rule-width";
var colms = "column-span";
var colmw = "column-width";
var cor = "counter-reset";
var cp = "clip:auto|rect(${1:top} ${2:right} ${3:bottom} ${4:left})";
var cps = "caption-side:top|bottom";
var cur = "cursor:pointer|auto|default|crosshair|hand|help|move|pointer|text";
var d = "display:grid|inline-grid|subgrid|block|none|flex|inline-flex|inline|inline-block|list-item|run-in|compact|table|inline-table|table-caption|table-column|table-column-group|table-header-group|table-footer-group|table-row|table-row-group|table-cell|ruby|ruby-base|ruby-base-group|ruby-text|ruby-text-group";
var ec = "empty-cells:show|hide";
var f = "font:${1:1em} ${2:sans-serif}";
var fd = "font-display:auto|block|swap|fallback|optional";
var fef = "font-effect:none|engrave|emboss|outline";
var fem = "font-emphasize";
var femp = "font-emphasize-position:before|after";
var fems = "font-emphasize-style:none|accent|dot|circle|disc";
var ff = "font-family:serif|sans-serif|cursive|fantasy|monospace";
var fft = 'font-family:"Times New Roman", Times, Baskerville, Georgia, serif';
var ffa = 'font-family:Arial, "Helvetica Neue", Helvetica, sans-serif';
var ffv = "font-family:Verdana, Geneva, sans-serif";
var fl = "float:left|right|none";
var fs = "font-style:italic|normal|oblique";
var fsm = "font-smoothing:antialiased|subpixel-antialiased|none";
var fst = "font-stretch:normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded";
var fv = "font-variant:normal|small-caps";
var fvs = "font-variation-settings:normal|inherit|initial|unset";
var fw = "font-weight:normal|bold|bolder|lighter";
var fx = "flex";
var fxb = "flex-basis:fill|max-content|min-content|fit-content|content";
var fxd = "flex-direction:row|row-reverse|column|column-reverse";
var fxf = "flex-flow";
var fxg = "flex-grow";
var fxsh = "flex-shrink";
var fxw = "flex-wrap:nowrap|wrap|wrap-reverse";
var fz = "font-size";
var fza = "font-size-adjust";
var gtc = "grid-template-columns:repeat()|minmax()";
var gtr = "grid-template-rows:repeat()|minmax()";
var gta = "grid-template-areas";
var gt = "grid-template";
var gg = "grid-gap";
var gcg = "grid-column-gap";
var grg = "grid-row-gap";
var gac = "grid-auto-columns:auto|minmax()";
var gar = "grid-auto-rows:auto|minmax()";
var gaf = "grid-auto-flow:row|column|dense|inherit|initial|unset";
var gd = "grid";
var gc = "grid-column";
var gcs = "grid-column-start";
var gce = "grid-column-end";
var gr = "grid-row";
var grs = "grid-row-start";
var gre = "grid-row-end";
var ga = "grid-area";
var h = "height";
var jc = "justify-content:start|end|stretch|flex-start|flex-end|center|space-between|space-around|space-evenly";
var ji = "justify-items:start|end|center|stretch";
var js = "justify-self:start|end|center|stretch";
var l = "left";
var lg = "background-image:linear-gradient(${1})";
var lh = "line-height";
var lis = "list-style";
var lisi = "list-style-image";
var lisp = "list-style-position:inside|outside";
var list = "list-style-type:disc|circle|square|decimal|decimal-leading-zero|lower-roman|upper-roman";
var lts = "letter-spacing:normal";
var m = "margin";
var mah = "max-height";
var mar = "max-resolution";
var maw = "max-width";
var mb = "margin-bottom";
var mih = "min-height";
var mir = "min-resolution";
var miw = "min-width";
var ml = "margin-left";
var mr = "margin-right";
var mt = "margin-top";
var ol = "outline";
var olc = "outline-color:${1:#000}|invert";
var olo = "outline-offset";
var ols = "outline-style:none|dotted|dashed|solid|double|groove|ridge|inset|outset";
var olw = "outline-width|thin|medium|thick";
var op = "opacity";
var ord = "order";
var ori = "orientation:landscape|portrait";
var orp = "orphans";
var ov = "overflow:hidden|visible|hidden|scroll|auto";
var ovs = "overflow-style:scrollbar|auto|scrollbar|panner|move|marquee";
var ovx = "overflow-x:hidden|visible|hidden|scroll|auto";
var ovy = "overflow-y:hidden|visible|hidden|scroll|auto";
var p = "padding";
var pb = "padding-bottom";
var pgba = "page-break-after:auto|always|left|right";
var pgbb = "page-break-before:auto|always|left|right";
var pgbi = "page-break-inside:auto|avoid";
var pl = "padding-left";
var pos = "position:relative|absolute|relative|fixed|static";
var pr = "padding-right";
var pt = "padding-top";
var q = "quotes";
var qen = "quotes:'\\201C' '\\201D' '\\2018' '\\2019'";
var qru = "quotes:'\\00AB' '\\00BB' '\\201E' '\\201C'";
var r = "right";
var rsz = "resize:none|both|horizontal|vertical";
var t = "top";
var ta = "text-align:left|center|right|justify";
var tal = "text-align-last:left|center|right";
var tbl = "table-layout:fixed";
var td = "text-decoration:none|underline|overline|line-through";
var te = "text-emphasis:none|accent|dot|circle|disc|before|after";
var th = "text-height:auto|font-size|text-size|max-size";
var ti = "text-indent";
var tj = "text-justify:auto|inter-word|inter-ideograph|inter-cluster|distribute|kashida|tibetan";
var to = "text-outline:${1:0} ${2:0} ${3:#000}";
var tov = "text-overflow:ellipsis|clip";
var tr = "text-replace";
var trf = "transform:${1}|skewX(${1:angle})|skewY(${1:angle})|scale(${1:x}, ${2:y})|scaleX(${1:x})|scaleY(${1:y})|scaleZ(${1:z})|scale3d(${1:x}, ${2:y}, ${3:z})|rotate(${1:angle})|rotateX(${1:angle})|rotateY(${1:angle})|rotateZ(${1:angle})|translate(${1:x}, ${2:y})|translateX(${1:x})|translateY(${1:y})|translateZ(${1:z})|translate3d(${1:tx}, ${2:ty}, ${3:tz})";
var trfo = "transform-origin";
var trfs = "transform-style:preserve-3d";
var trs = "transition:${1:prop} ${2:time}";
var trsde = "transition-delay:${1:time}";
var trsdu = "transition-duration:${1:time}";
var trsp = "transition-property:${1:prop}";
var trstf = "transition-timing-function:${1:fn}";
var tsh = "text-shadow:${1:hoff} ${2:voff} ${3:blur} ${4:#000}";
var tt = "text-transform:uppercase|lowercase|capitalize|none";
var tw = "text-wrap:none|normal|unrestricted|suppress";
var us = "user-select:none";
var v = "visibility:hidden|visible|collapse";
var va = "vertical-align:top|super|text-top|middle|baseline|bottom|text-bottom|sub";
var w = "width";
var whs = "white-space:nowrap|pre|pre-wrap|pre-line|normal";
var whsc = "white-space-collapse:normal|keep-all|loose|break-strict|break-all";
var wid = "widows";
var wm = "writing-mode:lr-tb|lr-tb|lr-bt|rl-tb|rl-bt|tb-rl|tb-lr|bt-lr|bt-rl";
var wob = "word-break:normal|keep-all|break-all";
var wos = "word-spacing";
var wow = "word-wrap:none|unrestricted|suppress|break-word|normal";
var z = "z-index";
var zom = "zoom:1";
var cssSnippet = {
    "@f": "@font-face {\n	font-family: ${1};\n	src: url(${1});\n}",
    "@ff": "@font-face {\n	font-family: '${1:FontName}';\n	src: url('${2:FileName}.eot');\n	src: url('${2:FileName}.eot?#iefix') format('embedded-opentype'),\n		 url('${2:FileName}.woff') format('woff'),\n		 url('${2:FileName}.ttf') format('truetype'),\n		 url('${2:FileName}.svg#${1:FontName}') format('svg');\n	font-style: ${3:normal};\n	font-weight: ${4:normal};\n}",
    "@i|@import": "@import url(${0});",
    "@kf": "@keyframes ${1:identifier} {\n	${2}\n}",
    "@m|@media": "@media ${1:screen} {\n	${0}\n}",
    ac,
    ai,
    anim,
    animdel,
    animdir,
    animdur,
    animfm,
    animic,
    animn,
    animps,
    animtf,
    ap,
    as,
    b,
    bd,
    bdb,
    bdbc,
    bdbi,
    bdbk,
    bdbli,
    bdblrs,
    bdbri,
    bdbrrs,
    bdbs,
    bdbw,
    bdc,
    bdci,
    bdcl,
    bdf,
    bdi,
    bdl,
    bdlc,
    bdlen,
    bdli,
    bdls,
    bdlw,
    bdr,
    bdrc,
    bdri,
    bdrs,
    bdrst,
    bdrw,
    bds,
    bdsp,
    bdt,
    bdtc,
    bdti,
    bdtli,
    bdtlrs,
    bdtri,
    bdtrrs,
    bdts,
    bdtw,
    bdw,
    bfv,
    bg,
    bga,
    bgbk,
    bgc,
    bgcp,
    bgi,
    bgo,
    bgp,
    bgpx,
    bgpy,
    bgr,
    bgsz,
    bxsh,
    bxsz,
    c,
    cl,
    cm,
    cnt,
    coi,
    colm,
    colmc,
    colmf,
    colmg,
    colmr,
    colmrc,
    colmrs,
    colmrw,
    colms,
    colmw,
    cor,
    cp,
    cps,
    cur,
    d,
    ec,
    f,
    fd,
    fef,
    fem,
    femp,
    fems,
    ff,
    fft,
    ffa,
    ffv,
    fl,
    fs,
    fsm,
    fst,
    fv,
    fvs,
    fw,
    fx,
    fxb,
    fxd,
    fxf,
    fxg,
    fxsh,
    fxw,
    fz,
    fza,
    gtc,
    gtr,
    gta,
    gt,
    gg,
    gcg,
    grg,
    gac,
    gar,
    gaf,
    gd,
    gc,
    gcs,
    gce,
    gr,
    grs,
    gre,
    ga,
    h,
    jc,
    ji,
    js,
    l,
    lg,
    lh,
    lis,
    lisi,
    lisp,
    list,
    lts,
    m,
    mah,
    mar,
    maw,
    mb,
    mih,
    mir,
    miw,
    ml,
    mr,
    mt,
    ol,
    olc,
    olo,
    ols,
    olw,
    op,
    ord,
    ori,
    orp,
    ov,
    ovs,
    ovx,
    ovy,
    p,
    pb,
    pgba,
    pgbb,
    pgbi,
    pl,
    pos,
    pr,
    pt,
    q,
    qen,
    qru,
    r,
    rsz,
    t,
    ta,
    tal,
    tbl,
    td,
    te,
    th,
    ti,
    tj,
    to,
    tov,
    tr,
    trf,
    trfo,
    trfs,
    trs,
    trsde,
    trsdu,
    trsp,
    trstf,
    tsh,
    tt,
    tw,
    us,
    v,
    va,
    w,
    whs,
    whsc,
    wid,
    wm,
    wob,
    wos,
    wow,
    z,
    zom
};
var Attribute = function Attribute2(name, value, options) {
    this.name = name;
    this.value = value != null ? value : null;
    this.options = options || {};
};
Attribute.prototype.clone = function clone() {
    return new Attribute(this.name, this.value, Object.assign({}, this.options));
};
Attribute.prototype.valueOf = function valueOf() {
    return this.name + '="' + this.value + '"';
};
var Node = function Node2(name, attributes) {
    var this$1 = this;
    this.name = name || null;
    this.value = null;
    this.repeat = null;
    this.selfClosing = false;
    this.children = [];
    this.parent = null;
    this.next = null;
    this.previous = null;
    this._attributes = [];
    if (Array.isArray(attributes)) {
        attributes.forEach(function (attr) {
            return this$1.setAttribute(attr);
        });
    }
};
var prototypeAccessors$1 = { attributes: { configurable: true }, attributesMap: { configurable: true }, isGroup: { configurable: true }, isTextOnly: { configurable: true }, firstChild: { configurable: true }, lastChild: { configurable: true }, childIndex: { configurable: true }, nextSibling: { configurable: true }, previousSibling: { configurable: true }, classList: { configurable: true } };
prototypeAccessors$1.attributes.get = function () {
    return this._attributes;
};
prototypeAccessors$1.attributesMap.get = function () {
    return this.attributes.reduce(function (out2, attr) {
        out2[attr.name] = attr.options.boolean ? attr.name : attr.value;
        return out2;
    }, {});
};
prototypeAccessors$1.isGroup.get = function () {
    return !this.name && !this.value && !this._attributes.length;
};
prototypeAccessors$1.isTextOnly.get = function () {
    return !this.name && !!this.value && !this._attributes.length;
};
prototypeAccessors$1.firstChild.get = function () {
    return this.children[0];
};
prototypeAccessors$1.lastChild.get = function () {
    return this.children[this.children.length - 1];
};
prototypeAccessors$1.childIndex.get = function () {
    return this.parent ? this.parent.children.indexOf(this) : -1;
};
prototypeAccessors$1.nextSibling.get = function () {
    return this.next;
};
prototypeAccessors$1.previousSibling.get = function () {
    return this.previous;
};
prototypeAccessors$1.classList.get = function () {
    var attr = this.getAttribute("class");
    return attr && attr.value ? attr.value.split(/\s+/g).filter(uniqueClass) : [];
};
Node.prototype.create = function create(name, attributes) {
    return new Node(name, attributes);
};
Node.prototype.setAttribute = function setAttribute(name, value) {
    var attr = createAttribute(name, value);
    var curAttr = this.getAttribute(name);
    if (curAttr) {
        this.replaceAttribute(curAttr, attr);
    } else {
        this._attributes.push(attr);
    }
};
Node.prototype.hasAttribute = function hasAttribute(name) {
    return !!this.getAttribute(name);
};
Node.prototype.getAttribute = function getAttribute(name) {
    if (typeof name === "object") {
        name = name.name;
    }
    for (var i = 0; i < this._attributes.length; i++) {
        var attr = this._attributes[i];
        if (attr.name === name) {
            return attr;
        }
    }
};
Node.prototype.replaceAttribute = function replaceAttribute(curAttribute, newName, newValue) {
    if (typeof curAttribute === "string") {
        curAttribute = this.getAttribute(curAttribute);
    }
    var ix = this._attributes.indexOf(curAttribute);
    if (ix !== -1) {
        this._attributes.splice(ix, 1, createAttribute(newName, newValue));
    }
};
Node.prototype.removeAttribute = function removeAttribute(attr) {
    if (typeof attr === "string") {
        attr = this.getAttribute(attr);
    }
    var ix = this._attributes.indexOf(attr);
    if (ix !== -1) {
        this._attributes.splice(ix, 1);
    }
};
Node.prototype.clearAttributes = function clearAttributes() {
    this._attributes.length = 0;
};
Node.prototype.addClass = function addClass(token) {
    token = normalize(token);
    if (!this.hasAttribute("class")) {
        this.setAttribute("class", token);
    } else if (token && !this.hasClass(token)) {
        this.setAttribute("class", this.classList.concat(token).join(" "));
    }
};
Node.prototype.hasClass = function hasClass(token) {
    return this.classList.indexOf(normalize(token)) !== -1;
};
Node.prototype.removeClass = function removeClass(token) {
    token = normalize(token);
    if (this.hasClass(token)) {
        this.setAttribute("class", this.classList.filter(function (name) {
            return name !== token;
        }).join(" "));
    }
};
Node.prototype.appendChild = function appendChild(node) {
    this.insertAt(node, this.children.length);
};
Node.prototype.insertBefore = function insertBefore(newNode, refNode) {
    this.insertAt(newNode, this.children.indexOf(refNode));
};
Node.prototype.insertAt = function insertAt(node, pos2) {
    if (pos2 < 0 || pos2 > this.children.length) {
        throw new Error("Unable to insert node: position is out of child list range");
    }
    var prev = this.children[pos2 - 1];
    var next = this.children[pos2];
    node.remove();
    node.parent = this;
    this.children.splice(pos2, 0, node);
    if (prev) {
        node.previous = prev;
        prev.next = node;
    }
    if (next) {
        node.next = next;
        next.previous = node;
    }
};
Node.prototype.removeChild = function removeChild(node) {
    var ix = this.children.indexOf(node);
    if (ix !== -1) {
        this.children.splice(ix, 1);
        if (node.previous) {
            node.previous.next = node.next;
        }
        if (node.next) {
            node.next.previous = node.previous;
        }
        node.parent = node.next = node.previous = null;
    }
};
Node.prototype.remove = function remove() {
    if (this.parent) {
        this.parent.removeChild(this);
    }
};
Node.prototype.clone = function clone(deep) {
    var clone2 = new Node(this.name);
    clone2.value = this.value;
    clone2.selfClosing = this.selfClosing;
    if (this.repeat) {
        clone2.repeat = Object.assign({}, this.repeat);
    }
    this._attributes.forEach(function (attr) {
        return clone2.setAttribute(attr.clone());
    });
    if (deep) {
        this.children.forEach(function (child) {
            return clone2.appendChild(child.clone(true));
        });
    }
    return clone2;
};
Node.prototype.walk = function walk(fn, _level) {
    _level = _level || 0;
    var ctx = this.firstChild;
    while (ctx) {
        var next = ctx.next;
        if (fn(ctx, _level) === false || ctx.walk(fn, _level + 1) === false) {
            return false;
        }
        ctx = next;
    }
};
Node.prototype.use = function use(fn) {
    var arguments$1 = arguments;
    var args = [this];
    for (var i = 1; i < arguments.length; i++) {
        args.push(arguments$1[i]);
    }
    fn.apply(null, args);
    return this;
};
Node.prototype.toString = function toString() {
    var this$1 = this;
    var attrs = this.attributes.map(function (attr) {
        attr = this$1.getAttribute(attr.name);
        var opt2 = attr.options;
        var out3 = "" + (opt2 && opt2.implied ? "!" : "") + (attr.name || "");
        if (opt2 && opt2.boolean) {
            out3 += ".";
        } else if (attr.value != null) {
            out3 += '="' + attr.value + '"';
        }
        return out3;
    });
    var out2 = "" + (this.name || "");
    if (attrs.length) {
        out2 += "[" + attrs.join(" ") + "]";
    }
    if (this.value != null) {
        out2 += "{" + this.value + "}";
    }
    if (this.selfClosing) {
        out2 += "/";
    }
    if (this.repeat) {
        out2 += "*" + (this.repeat.count ? this.repeat.count : "");
        if (this.repeat.value != null) {
            out2 += "@" + this.repeat.value;
        }
    }
    return out2;
};
Object.defineProperties(Node.prototype, prototypeAccessors$1);
function createAttribute(name, value) {
    if (name instanceof Attribute) {
        return name;
    }
    if (typeof name === "string") {
        return new Attribute(name, value);
    }
    if (name && typeof name === "object") {
        return new Attribute(name.name, name.value, name.options);
    }
}
function normalize(str2) {
    return String(str2).trim();
}
function uniqueClass(item, i, arr) {
    return item && arr.indexOf(item) === i;
}
var CSSValue = function CSSValue2() {
    this.type = "css-value";
    this.value = [];
};
var prototypeAccessors$2 = { size: { configurable: true } };
prototypeAccessors$2.size.get = function () {
    return this.value.length;
};
CSSValue.prototype.add = function add(value) {
    this.value.push(value);
};
CSSValue.prototype.has = function has(value) {
    return this.value.indexOf(value) !== -1;
};
CSSValue.prototype.toString = function toString() {
    return this.value.join(" ");
};
Object.defineProperties(CSSValue.prototype, prototypeAccessors$2);
var Color = function Color2(value, alpha) {
    this.type = "color";
    this.raw = value;
    this.alpha = Number(alpha != null && alpha !== "" ? alpha : 1);
    value = value.slice(1);
    var r2 = 0, g = 0, b2 = 0;
    if (value === "t") {
        this.alpha = 0;
    } else {
        switch (value.length) {
            case 0:
                break;
            case 1:
                r2 = g = b2 = value + value;
                break;
            case 2:
                r2 = g = b2 = value;
                break;
            case 3:
                r2 = value[0] + value[0];
                g = value[1] + value[1];
                b2 = value[2] + value[2];
                break;
            default:
                value += value;
                r2 = value.slice(0, 2);
                g = value.slice(2, 4);
                b2 = value.slice(4, 6);
        }
    }
    this.r = parseInt(r2, 16);
    this.g = parseInt(g, 16);
    this.b = parseInt(b2, 16);
};
Color.prototype.toHex = function toHex$1(short) {
    var fn = short && isShortHex(this.r) && isShortHex(this.g) && isShortHex(this.b) ? toShortHex : toHex;
    return "#" + fn(this.r) + fn(this.g) + fn(this.b);
};
Color.prototype.toRGB = function toRGB() {
    var values = [this.r, this.g, this.b];
    if (this.alpha !== 1) {
        values.push(this.alpha.toFixed(8).replace(/\.?0+$/, ""));
    }
    return (values.length === 3 ? "rgb" : "rgba") + "(" + values.join(", ") + ")";
};
Color.prototype.toString = function toString(short) {
    if (!this.r && !this.g && !this.b && !this.alpha) {
        return "transparent";
    }
    return this.alpha === 1 ? this.toHex(short) : this.toRGB();
};
function isShortHex(hex) {
    return !(hex % 17);
}
function toShortHex(num) {
    return (num >> 4).toString(16);
}
function toHex(num) {
    return pad(num.toString(16), 2);
}
function pad(value, len) {
    while (value.length < len) {
        value = "0" + value;
    }
    return value;
}
var NumericValue = function NumericValue2(value, unit) {
    this.type = "numeric";
    this.value = Number(value);
    this.unit = unit || "";
};
NumericValue.prototype.toString = function toString() {
    return "" + this.value + this.unit;
};
var Keyword = function Keyword2(value) {
    this.type = "keyword";
    this.value = value;
};
Keyword.prototype.toString = function toString() {
    return this.value;
};
var QuotedString = function QuotedString2(value) {
    this.type = "string";
    this.value = value;
};
QuotedString.prototype.toString = function toString() {
    return this.value;
};
var FunctionCall = function FunctionCall2(name, args) {
    this.type = "function";
    this.name = name;
    this.args = args || [];
};
FunctionCall.prototype.toString = function toString() {
    return this.name + "(" + this.args.join(", ") + ")";
};
var Snippet = function Snippet2(key, value) {
    this.key = key;
    this.value = value;
};
var SnippetsStorage = function SnippetsStorage2(data) {
    this._string = new Map();
    this._regexp = new Map();
    this._disabled = false;
    this.load(data);
};
var prototypeAccessors$3 = { disabled: { configurable: true } };
prototypeAccessors$3.disabled.get = function () {
    return this._disabled;
};
SnippetsStorage.prototype.disable = function disable() {
    this._disabled = true;
};
SnippetsStorage.prototype.enable = function enable() {
    this._disabled = false;
};
SnippetsStorage.prototype.set = function set(key, value) {
    var this$1 = this;
    if (typeof key === "string") {
        key.split("|").forEach(function (k) {
            return this$1._string.set(k, new Snippet(k, value));
        });
    } else if (key instanceof RegExp) {
        this._regexp.set(key, new Snippet(key, value));
    } else {
        throw new Error("Unknow snippet key: " + key);
    }
    return this;
};
SnippetsStorage.prototype.get = function get(key) {
    if (this.disabled) {
        return void 0;
    }
    if (this._string.has(key)) {
        return this._string.get(key);
    }
    var keys = Array.from(this._regexp.keys());
    for (var i = 0, il = keys.length; i < il; i++) {
        if (keys[i].test(key)) {
            return this._regexp.get(keys[i]);
        }
    }
};
SnippetsStorage.prototype.load = function load(data) {
    var this$1 = this;
    this.reset();
    if (data instanceof Map) {
        data.forEach(function (value, key) {
            return this$1.set(key, value);
        });
    } else if (data && typeof data === "object") {
        Object.keys(data).forEach(function (key) {
            return this$1.set(key, data[key]);
        });
    }
};
SnippetsStorage.prototype.reset = function reset() {
    this._string.clear();
    this._regexp.clear();
};
SnippetsStorage.prototype.values = function values() {
    if (this.disabled) {
        return [];
    }
    var string = Array.from(this._string.values());
    var regexp = Array.from(this._regexp.values());
    return string.concat(regexp);
};
Object.defineProperties(SnippetsStorage.prototype, prototypeAccessors$3);
var SnippetsRegistry = function SnippetsRegistry2(data) {
    var this$1 = this;
    this._registry = [];
    if (Array.isArray(data)) {
        data.forEach(function (snippets, level) {
            return this$1.add(level, snippets);
        });
    } else if (typeof data === "object") {
        this.add(data);
    }
};
SnippetsRegistry.prototype.get = function get(level) {
    for (var i = 0; i < this._registry.length; i++) {
        var item = this._registry[i];
        if (item.level === level) {
            return item.store;
        }
    }
};
SnippetsRegistry.prototype.add = function add(level, snippets) {
    if (level != null && typeof level === "object") {
        snippets = level;
        level = 0;
    }
    var store = new SnippetsStorage(snippets);
    this.remove(level);
    this._registry.push({ level, store });
    this._registry.sort(function (a2, b2) {
        return b2.level - a2.level;
    });
    return store;
};
SnippetsRegistry.prototype.remove = function remove(data) {
    this._registry = this._registry.filter(function (item) {
        return item.level !== data && item.store !== data;
    });
};
SnippetsRegistry.prototype.resolve = function resolve(name) {
    for (var i = 0; i < this._registry.length; i++) {
        var snippet = this._registry[i].store.get(name);
        if (snippet) {
            return snippet;
        }
    }
};
SnippetsRegistry.prototype.all = function all(options) {
    options = options || {};
    var result = new Map();
    var fillResult = function (snippet) {
        var type = snippet.key instanceof RegExp ? "regexp" : "string";
        if ((!options.type || options.type === type) && !result.has(snippet.key)) {
            result.set(snippet.key, snippet);
        }
    };
    this._registry.forEach(function (item) {
        item.store.values().forEach(fillResult);
    });
    return Array.from(result.values());
};
SnippetsRegistry.prototype.clear = function clear() {
    this._registry.length = 0;
};
var defaultOptions$2 = {
    indent: "	",
    tagCase: "",
    attributeCase: "",
    attributeQuotes: "double",
    format: true,
    formatSkip: ["html"],
    formatForce: ["body"],
    inlineBreak: 3,
    compactBooleanAttributes: false,
    booleanAttributes: [
        "contenteditable",
        "seamless",
        "async",
        "autofocus",
        "autoplay",
        "checked",
        "controls",
        "defer",
        "disabled",
        "formnovalidate",
        "hidden",
        "ismap",
        "loop",
        "multiple",
        "muted",
        "novalidate",
        "readonly",
        "required",
        "reversed",
        "selected",
        "typemustmatch"
    ],
    selfClosingStyle: "html",
    inlineElements: [
        "a",
        "abbr",
        "acronym",
        "applet",
        "b",
        "basefont",
        "bdo",
        "big",
        "br",
        "button",
        "cite",
        "code",
        "del",
        "dfn",
        "em",
        "font",
        "i",
        "iframe",
        "img",
        "input",
        "ins",
        "kbd",
        "label",
        "map",
        "object",
        "q",
        "s",
        "samp",
        "select",
        "small",
        "span",
        "strike",
        "strong",
        "sub",
        "sup",
        "textarea",
        "tt",
        "u",
        "var"
    ]
};
var Profile = function Profile2(options) {
    this.options = Object.assign({}, defaultOptions$2, options);
    this.quoteChar = this.options.attributeQuotes === "single" ? "'" : '"';
};
Profile.prototype.get = function get(name) {
    return this.options[name];
};
Profile.prototype.quote = function quote(str2) {
    return "" + this.quoteChar + (str2 != null ? str2 : "") + this.quoteChar;
};
Profile.prototype.name = function name(name$1) {
    return strcase(name$1, this.options.tagCase);
};
Profile.prototype.attribute = function attribute(attr) {
    return strcase(attr, this.options.attributeCase);
};
Profile.prototype.isBooleanAttribute = function isBooleanAttribute(attr) {
    return attr.options.boolean || this.get("booleanAttributes").indexOf((attr.name || "").toLowerCase()) !== -1;
};
Profile.prototype.selfClose = function selfClose() {
    switch (this.options.selfClosingStyle) {
        case "xhtml":
            return " /";
        case "xml":
            return "/";
        default:
            return "";
    }
};
Profile.prototype.indent = function indent(level) {
    level = level || 0;
    var output = "";
    while (level--) {
        output += this.options.indent;
    }
    return output;
};
Profile.prototype.isInline = function isInline2(node) {
    if (typeof node === "string") {
        return this.get("inlineElements").indexOf(node.toLowerCase()) !== -1;
    }
    return node.name != null ? this.isInline(node.name) : node.isTextOnly;
};
Profile.prototype.field = function field(index2, placeholder2) {
    return this.options.field(index2, placeholder2);
};
function strcase(string, type) {
    if (type) {
        return type === "upper" ? string.toUpperCase() : string.toLowerCase();
    }
    return string;
}
var defaultOption = {
    field: function (index2, placeholder2) {
        return "${" + index2 + (placeholder2 ? ":" + placeholder2 : "") + "}";
    }
};
function checkMonacoExists(monaco) {
    if (!monaco) {
        console.error("emmet-monaco-es: 'monaco' should be either declared on window or passed as first parameter");
    }
    return !!monaco;
}
function onCompletion(monaco, language, isLegalToken, getLegalEmmetSets) {
    var isHTML = language === "typescript";
    if (typeof language === "string") {
        language = [language];
    }
    var providers = language.map(function (lang) {
        return monaco.languages.registerCompletionItemProvider(lang, {
            triggerCharacters: ">+-^*()#.[]$@{}=!:%".split(""),
            provideCompletionItems: function (model, position) {
                var column = position.column, lineNumber = position.lineNumber;

                if (column === 1 || column <= model.getLineFirstNonWhitespaceColumn(lineNumber)) {
                    return;
                }
                var tokenizationSupport = model._tokenization._tokenizationSupport;
                var state = tokenizationSupport.getInitialState();
                var tokenizationResult;
                for (var i = 1; i <= lineNumber; i++) {
                    tokenizationResult = tokenizationSupport.tokenize(model.getLineContent(i), true, state, 0);
                    state = tokenizationResult.endState;
                }
                var tokens = tokenizationResult.tokens;
                var setArr;
                for (var i = tokens.length - 1; i >= 0; i--) {
                    if (column - 1 > tokens[i].offset) {
                        if (isLegalToken(tokens, i)) {
                            let offset = 0;
                            for (let t of tokens) {
                                if (t.type === "delimiter.ts") {
                                    offset = t.offset;
                                    break
                                }
                            }

                            setArr = getLegalEmmetSets(model.getLineContent(lineNumber).substring(offset, column - 1));
                        }
                        break;
                    }
                }
                if (!setArr) {
                    return;
                }
                return {
                    suggestions: setArr.map(function (_a) {
                        var emmetText = _a.emmetText, expandText = _a.expandText;
                        var label2 = isHTML ? emmetText : expandText.replace(/([^\\])\$\{\d+\}/g, "$1").replace(/\$\{\d+:([^\}]+)\}/g, "$1");
                        return {
                            kind: monaco.languages.CompletionItemKind.Property,
                            label: label2,
                            sortText: "0" + label2,
                            insertText: expandText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: new monaco.Range(lineNumber, column - emmetText.length, lineNumber, column),
                            detail: "Emmet Abbreviation",
                            documentation: expandText.replace(/([^\\])\$\{\d+\}/g, "$1|").replace(/\$\{\d+:([^\}]+)\}/g, "$1")
                        };
                    }),
                    incomplete: true
                };
            }
        });
    });
    return function () {
        providers.forEach(function (provider) {
            return provider.dispose();
        });
    };
}
var option = __assign(__assign({}, defaultOption), { snippets: new SnippetsRegistry(cssSnippet), profile: new Profile() });
var ASTERISK = 42;
function consumeRepeat(stream) {
    if (stream.eat(ASTERISK)) {
        stream.start = stream.pos;
        return { count: stream.eatWhile(isNumber) ? +stream.current() : null };
    }
}
var opt$1 = { throws: true };
function consumeQuoted$1(stream) {
    if (eatQuoted(stream, opt$1)) {
        return stream.current().slice(1, -1);
    }
}
var TEXT_START = 123;
var TEXT_END = 125;
var ESCAPE$1 = 92;
function consumeText(stream) {
    var start = stream.pos;
    if (stream.eat(TEXT_START)) {
        var stack = 1, ch;
        var result = "";
        var offset = stream.pos;
        while (!stream.eof()) {
            ch = stream.next();
            if (ch === TEXT_START) {
                stack++;
            } else if (ch === TEXT_END) {
                stack--;
                if (!stack) {
                    stream.start = start;
                    return result + stream.substring(offset, stream.pos - 1);
                }
            } else if (ch === ESCAPE$1) {
                ch = stream.next();
                if (ch === TEXT_START || ch === TEXT_END) {
                    result += stream.substring(offset, stream.pos - 2) + String.fromCharCode(ch);
                    offset = stream.pos;
                }
            }
        }
        stream.pos = start;
        throw stream.error("Unable to find closing " + String.fromCharCode(TEXT_END) + " for text start");
    }
    return null;
}
var EXCL$1 = 33;
var DOT$2 = 46;
var EQUALS = 61;
var ATTR_OPEN = 91;
var ATTR_CLOSE = 93;
var reAttributeName = /^\!?[\w\-:\$@]+\.?$|^\!?\[[\w\-:\$@]+\]\.?$/;
function consumeAttributes(stream) {
    if (!stream.eat(ATTR_OPEN)) {
        return null;
    }
    var result = [];
    var token, attr;
    while (!stream.eof()) {
        stream.eatWhile(isWhiteSpace);
        if (stream.eat(ATTR_CLOSE)) {
            return result;
        } else if ((token = consumeQuoted$1(stream)) != null) {
            result.push({
                name: null,
                value: token
            });
        } else if (eatUnquoted(stream)) {
            token = stream.current();
            if (token[0] === "[" && stream.peek() === ATTR_CLOSE) {
                stream.next();
                token = stream.current();
            }
            if (!reAttributeName.test(token)) {
                result.push({ name: null, value: token });
            } else {
                attr = parseAttributeName(token);
                result.push(attr);
                if (stream.eat(EQUALS)) {
                    if ((token = consumeQuoted$1(stream)) != null) {
                        attr.value = token;
                    } else if ((token = consumeText(stream)) != null) {
                        attr.value = token;
                        attr.options = {
                            before: "{",
                            after: "}"
                        };
                    } else if (eatUnquoted(stream)) {
                        attr.value = stream.current();
                    }
                }
            }
        } else {
            throw stream.error("Expected attribute name");
        }
    }
    throw stream.error('Expected closing "]" brace');
}
function parseAttributeName(name) {
    var options = {};
    if (name.charCodeAt(0) === EXCL$1) {
        name = name.slice(1);
        options.implied = true;
    }
    if (name.charCodeAt(name.length - 1) === DOT$2) {
        name = name.slice(0, name.length - 1);
        options.boolean = true;
    }
    var attr = { name };
    if (Object.keys(options).length) {
        attr.options = options;
    }
    return attr;
}
function eatUnquoted(stream) {
    var start = stream.pos;
    if (stream.eatWhile(isUnquoted)) {
        stream.start = start;
        return true;
    }
}
function isUnquoted(code) {
    return !isSpace(code) && !isQuote(code) && code !== ATTR_CLOSE && code !== EQUALS;
}
var HASH$1 = 35;
var DOT$1$1 = 46;
var SLASH = 47;
function consumeElement(stream) {
    var start = stream.pos;
    var node = new Node(eatName(stream));
    var next;
    while (!stream.eof()) {
        if (stream.eat(DOT$1$1)) {
            node.addClass(eatName(stream));
        } else if (stream.eat(HASH$1)) {
            node.setAttribute("id", eatName(stream));
        } else if (stream.eat(SLASH)) {
            if (node.isGroup) {
                stream.backUp(1);
                throw stream.error("Unexpected self-closing indicator");
            }
            node.selfClosing = true;
            if (next = consumeRepeat(stream)) {
                node.repeat = next;
            }
            break;
        } else if (next = consumeAttributes(stream)) {
            for (var i = 0, il = next.length; i < il; i++) {
                node.setAttribute(next[i]);
            }
        } else if ((next = consumeText(stream)) !== null) {
            node.value = next;
        } else if (next = consumeRepeat(stream)) {
            node.repeat = next;
        } else {
            break;
        }
    }
    if (start === stream.pos) {
        throw stream.error("Unable to consume abbreviation node, unexpected " + stream.peek());
    }
    return node;
}
function eatName(stream) {
    stream.start = stream.pos;
    stream.eatWhile(isName);
    return stream.current();
}
function isName(code) {
    return isAlphaNumeric(code) || code === 45 || code === 58 || code === 36 || code === 64 || code === 33 || code === 95 || code === 37;
}
var GROUP_START = 40;
var GROUP_END = 41;
var OP_SIBLING = 43;
var OP_CHILD = 62;
var OP_CLIMB = 94;
function parse$1(str2) {
    var stream = new StreamReader(str2.trim());
    var root = new Node();
    var ctx = root, groupStack = [], ch;
    while (!stream.eof()) {
        ch = stream.peek();
        if (ch === GROUP_START) {
            var node = new Node();
            groupStack.push([node, ctx, stream.pos]);
            ctx = node;
            stream.next();
            continue;
        } else if (ch === GROUP_END) {
            var lastGroup = groupStack.pop();
            if (!lastGroup) {
                throw stream.error('Unexpected ")" group end');
            }
            var node$1 = lastGroup[0];
            ctx = lastGroup[1];
            stream.next();
            if (node$1.repeat = consumeRepeat(stream)) {
                ctx.appendChild(node$1);
            } else {
                while (node$1.firstChild) {
                    ctx.appendChild(node$1.firstChild);
                }
            }
            stream.eat(OP_SIBLING);
            continue;
        }
        var node$2 = consumeElement(stream);
        ctx.appendChild(node$2);
        if (stream.eof()) {
            break;
        }
        switch (stream.peek()) {
            case OP_SIBLING:
                stream.next();
                continue;
            case OP_CHILD:
                stream.next();
                ctx = node$2;
                continue;
            case OP_CLIMB:
                while (stream.eat(OP_CLIMB)) {
                    ctx = ctx.parent || ctx;
                }
                continue;
        }
    }
    if (groupStack.length) {
        stream.pos = groupStack.pop()[2];
        throw stream.error("Expected group close");
    }
    return root;
}
function index$3(abbr2) {
    var tree = parse$1(abbr2);
    tree.walk(unroll);
    return tree;
}
function unroll(node) {
    if (!node.repeat || !node.repeat.count) {
        return;
    }
    var parent = node.parent;
    var ix = parent.children.indexOf(node);
    for (var i = 0; i < node.repeat.count; i++) {
        var clone = node.clone(true);
        clone.repeat.value = i + 1;
        clone.walk(unroll);
        if (clone.isGroup) {
            while (clone.children.length > 0) {
                clone.firstChild.repeat = clone.repeat;
                parent.insertAt(clone.firstChild, ix++);
            }
        } else {
            parent.insertAt(clone, ix++);
        }
    }
    node.parent.removeChild(node);
}
var ASTERISK$1 = 42;
function consumeRepeat$1(stream) {
    if (stream.eat(ASTERISK$1)) {
        stream.start = stream.pos;
        return { count: stream.eatWhile(isNumber) ? +stream.current() : null };
    }
}
var opt$2 = { throws: true };
function consumeQuoted$2(stream) {
    if (eatQuoted(stream, opt$2)) {
        return stream.current().slice(1, -1);
    }
}
var TEXT_START$1 = 123;
var TEXT_END$1 = 125;
var ESCAPE$2 = 92;
function consumeText$1(stream) {
    var start = stream.pos;
    if (stream.eat(TEXT_START$1)) {
        var stack = 1, ch;
        var result = "";
        var offset = stream.pos;
        while (!stream.eof()) {
            ch = stream.next();
            if (ch === TEXT_START$1) {
                stack++;
            } else if (ch === TEXT_END$1) {
                stack--;
                if (!stack) {
                    stream.start = start;
                    return result + stream.substring(offset, stream.pos - 1);
                }
            } else if (ch === ESCAPE$2) {
                ch = stream.next();
                if (ch === TEXT_START$1 || ch === TEXT_END$1) {
                    result += stream.substring(offset, stream.pos - 2) + String.fromCharCode(ch);
                    offset = stream.pos;
                }
            }
        }
        stream.pos = start;
        throw stream.error("Unable to find closing " + String.fromCharCode(TEXT_END$1) + " for text start");
    }
    return null;
}
var EXCL$2 = 33;
var DOT$3 = 46;
var EQUALS$1 = 61;
var ATTR_OPEN$1 = 91;
var ATTR_CLOSE$1 = 93;
var reAttributeName$1 = /^\!?[\w\-:\$@]+\.?$/;
function consumeAttributes$1(stream) {
    if (!stream.eat(ATTR_OPEN$1)) {
        return null;
    }
    var result = [];
    var token, attr;
    while (!stream.eof()) {
        stream.eatWhile(isWhiteSpace);
        if (stream.eat(ATTR_CLOSE$1)) {
            return result;
        } else if ((token = consumeQuoted$2(stream)) != null) {
            result.push({
                name: null,
                value: token
            });
        } else if (eatUnquoted$1(stream)) {
            token = stream.current();
            if (!reAttributeName$1.test(token)) {
                result.push({ name: null, value: token });
            } else {
                attr = parseAttributeName$1(token);
                result.push(attr);
                if (stream.eat(EQUALS$1)) {
                    if ((token = consumeQuoted$2(stream)) != null) {
                        attr.value = token;
                    } else if ((token = consumeText$1(stream)) != null) {
                        attr.value = token;
                        attr.options = {
                            before: "{",
                            after: "}"
                        };
                    } else if (eatUnquoted$1(stream)) {
                        attr.value = stream.current();
                    }
                }
            }
        } else {
            throw stream.error("Expected attribute name");
        }
    }
    throw stream.error('Expected closing "]" brace');
}
function parseAttributeName$1(name) {
    var options = {};
    if (name.charCodeAt(0) === EXCL$2) {
        name = name.slice(1);
        options.implied = true;
    }
    if (name.charCodeAt(name.length - 1) === DOT$3) {
        name = name.slice(0, name.length - 1);
        options.boolean = true;
    }
    var attr = { name };
    if (Object.keys(options).length) {
        attr.options = options;
    }
    return attr;
}
function eatUnquoted$1(stream) {
    var start = stream.pos;
    if (stream.eatWhile(isUnquoted$1)) {
        stream.start = start;
        return true;
    }
}
function isUnquoted$1(code) {
    return !isSpace(code) && !isQuote(code) && code !== ATTR_OPEN$1 && code !== ATTR_CLOSE$1 && code !== EQUALS$1;
}
var HASH$2 = 35;
var DOT$1$2 = 46;
var SLASH$1 = 47;
function consumeElement$1(stream) {
    var start = stream.pos;
    var node = new Node(eatName$1(stream));
    var next;
    while (!stream.eof()) {
        if (stream.eat(DOT$1$2)) {
            node.addClass(eatName$1(stream));
        } else if (stream.eat(HASH$2)) {
            node.setAttribute("id", eatName$1(stream));
        } else if (stream.eat(SLASH$1)) {
            if (node.isGroup) {
                stream.backUp(1);
                throw stream.error("Unexpected self-closing indicator");
            }
            node.selfClosing = true;
            if (next = consumeRepeat$1(stream)) {
                node.repeat = next;
            }
            break;
        } else if (next = consumeAttributes$1(stream)) {
            for (var i = 0, il = next.length; i < il; i++) {
                node.setAttribute(next[i]);
            }
        } else if ((next = consumeText$1(stream)) !== null) {
            node.value = next;
        } else if (next = consumeRepeat$1(stream)) {
            node.repeat = next;
        } else {
            break;
        }
    }
    if (start === stream.pos) {
        throw stream.error("Unable to consume abbreviation node, unexpected " + stream.peek());
    }
    return node;
}
function eatName$1(stream) {
    stream.start = stream.pos;
    stream.eatWhile(isName$1);
    return stream.current();
}
function isName$1(code) {
    return isAlphaNumeric(code) || code === 45 || code === 58 || code === 36 || code === 64 || code === 33 || code === 95 || code === 37;
}
var GROUP_START$1 = 40;
var GROUP_END$1 = 41;
var OP_SIBLING$1 = 43;
var OP_CHILD$1 = 62;
var OP_CLIMB$1 = 94;
function parse$2(str2) {
    var stream = new StreamReader(str2.trim());
    var root = new Node();
    var ctx = root, groupStack = [], ch;
    while (!stream.eof()) {
        ch = stream.peek();
        if (ch === GROUP_START$1) {
            var node = new Node();
            groupStack.push([node, ctx, stream.pos]);
            ctx = node;
            stream.next();
            continue;
        } else if (ch === GROUP_END$1) {
            var lastGroup = groupStack.pop();
            if (!lastGroup) {
                throw stream.error('Unexpected ")" group end');
            }
            var node$1 = lastGroup[0];
            ctx = lastGroup[1];
            stream.next();
            if (node$1.repeat = consumeRepeat$1(stream)) {
                ctx.appendChild(node$1);
            } else {
                while (node$1.firstChild) {
                    ctx.appendChild(node$1.firstChild);
                }
            }
            stream.eat(OP_SIBLING$1);
            continue;
        }
        var node$2 = consumeElement$1(stream);
        ctx.appendChild(node$2);
        if (stream.eof()) {
            break;
        }
        switch (stream.peek()) {
            case OP_SIBLING$1:
                stream.next();
                continue;
            case OP_CHILD$1:
                stream.next();
                ctx = node$2;
                continue;
            case OP_CLIMB$1:
                while (stream.eat(OP_CLIMB$1)) {
                    ctx = ctx.parent || ctx;
                }
                continue;
        }
    }
    if (groupStack.length) {
        stream.pos = groupStack.pop()[2];
        throw stream.error("Expected group close");
    }
    return root;
}
function index$4(abbr2) {
    var tree = parse$2(abbr2);
    tree.walk(unroll$1);
    return tree;
}
function unroll$1(node) {
    if (!node.repeat || !node.repeat.count) {
        return;
    }
    var parent = node.parent;
    var ix = parent.children.indexOf(node);
    for (var i = 0; i < node.repeat.count; i++) {
        var clone = node.clone(true);
        clone.repeat.value = i + 1;
        clone.walk(unroll$1);
        if (clone.isGroup) {
            while (clone.children.length > 0) {
                clone.firstChild.repeat = clone.repeat;
                parent.insertAt(clone.firstChild, ix++);
            }
        } else {
            parent.insertAt(clone, ix++);
        }
    }
    node.parent.removeChild(node);
}
var index$5 = function (tree, registry2) {
    tree.walk(function (node) {
        return resolveNode$1(node, registry2);
    });
    return tree;
};
function resolveNode$1(node, registry2) {
    var stack = new Set();
    var resolve = function (node2) {
        var snippet = registry2.resolve(node2.name);
        if (!snippet || stack.has(snippet)) {
            return;
        }
        if (typeof snippet.value === "function") {
            return snippet.value(node2, registry2, resolve);
        }
        var tree = index$4(snippet.value);
        stack.add(snippet);
        tree.walk(resolve);
        stack.delete(snippet);
        var childTarget = findDeepestNode(tree);
        merge(childTarget, node2);
        while (tree.firstChild) {
            node2.parent.insertBefore(tree.firstChild, node2);
        }
        childTarget.parent.insertBefore(node2, childTarget);
        childTarget.remove();
    };
    resolve(node);
}
function merge(from, to2) {
    to2.name = from.name;
    if (from.selfClosing) {
        to2.selfClosing = true;
    }
    if (from.value != null) {
        to2.value = from.value;
    }
    if (from.repeat) {
        to2.repeat = Object.assign({}, from.repeat);
    }
    return mergeAttributes(from, to2);
}
function mergeAttributes(from, to2) {
    mergeClassNames(from, to2);
    var attrMap = new Map();
    var attrs = from.attributes;
    for (var i = 0; i < attrs.length; i++) {
        attrMap.set(attrs[i].name, attrs[i].clone());
    }
    attrs = to2.attributes.slice();
    for (var i$1 = 0, attr = void 0, a2 = void 0; i$1 < attrs.length; i$1++) {
        attr = attrs[i$1];
        if (attrMap.has(attr.name)) {
            a2 = attrMap.get(attr.name);
            a2.value = attr.value;
            if (a2.options.implied) {
                a2.options.implied = false;
            }
        } else {
            attrMap.set(attr.name, attr);
        }
        to2.removeAttribute(attr);
    }
    var newAttrs = Array.from(attrMap.values());
    for (var i$2 = 0; i$2 < newAttrs.length; i$2++) {
        to2.setAttribute(newAttrs[i$2]);
    }
    return to2;
}
function mergeClassNames(from, to2) {
    var classNames = from.classList;
    for (var i = 0; i < classNames.length; i++) {
        to2.addClass(classNames[i]);
    }
    return to2;
}
function findDeepestNode(node) {
    while (node.children.length) {
        node = node.children[node.children.length - 1];
    }
    return node;
}
var TOKEN = /^(.*?)([A-Z_]+)(.*?)$/;
var TOKEN_OPEN = 91;
var TOKEN_CLOSE = 93;
function template(str2, data) {
    if (str2 == null) {
        return str2;
    }
    var stack = [];
    var replacer = function (str3, left, token, right) {
        return data[token] != null ? left + data[token] + right : "";
    };
    var output = "";
    var offset = 0, i = 0;
    var code, lastPos;
    while (i < str2.length) {
        code = str2.charCodeAt(i);
        if (code === TOKEN_OPEN) {
            stack.push(i);
        } else if (code === TOKEN_CLOSE) {
            lastPos = stack.pop();
            if (!stack.length) {
                output += str2.slice(offset, lastPos) + str2.slice(lastPos + 1, i).replace(TOKEN, replacer);
                offset = i + 1;
            }
        }
        i++;
    }
    return output + str2.slice(offset);
}
function splitByLines$1(text) {
    return (text || "").split(/\r\n|\r|\n/g);
}
function isFirstChild(node) {
    return node.parent.firstChild === node;
}
function isRoot(node) {
    return node && !node.parent;
}
function isPseudoSnippet(node) {
    return node.isTextOnly && !!node.children.length;
}
function handlePseudoSnippet(outNode) {
    var node = outNode.node;
    if (isPseudoSnippet(node)) {
        var fieldsModel = parse(node.value);
        var field = findLowestIndexField(fieldsModel);
        if (field) {
            var parts = splitFieldsModel(fieldsModel, field);
            outNode.open = outNode.renderFields(parts[0]);
            outNode.close = outNode.renderFields(parts[1]);
        } else {
            outNode.text = outNode.renderFields(fieldsModel);
        }
        return true;
    }
    return false;
}
function findLowestIndexField(model) {
    return model.fields.reduce(function (result, field) {
        return !result || field.index < result.index ? field : result;
    }, null);
}
function splitFieldsModel(model, field) {
    var ix = model.fields.indexOf(field);
    var left = new model.constructor(model.string.slice(0, field.location), model.fields.slice(0, ix));
    var right = new model.constructor(model.string.slice(field.location + field.length), model.fields.slice(ix + 1));
    return [left, right];
}
var commentOptions = {
    enabled: false,
    trigger: ["id", "class"],
    before: "",
    after: "\n<!-- /[#ID][.CLASS] -->"
};
function html(tree, profile, options) {
    options = Object.assign({}, options);
    var format = getFormatOptions(options);
    return render(tree, options.field, function (outNode) {
        outNode = setFormatting(outNode, profile);
        if (!handlePseudoSnippet(outNode)) {
            var node = outNode.node;
            if (node.name) {
                var name = profile.name(node.name);
                var attrs = formatAttributes(outNode, profile);
                outNode.open = "<" + name + attrs + (node.selfClosing ? profile.selfClose() : "") + ">";
                if (!node.selfClosing) {
                    outNode.close = "</" + name + ">";
                }
                commentNode(outNode, format.comment);
            }
            if (node.value || !node.children.length && !node.selfClosing) {
                outNode.text = outNode.renderFields(node.value);
            }
        }
        return outNode;
    });
}
function setFormatting(outNode, profile) {
    var node = outNode.node;
    if (shouldFormatNode(node, profile)) {
        outNode.indent = profile.indent(getIndentLevel(node, profile));
        outNode.newline = "\n";
        var prefix = outNode.newline + outNode.indent;
        if (!isRoot(node.parent) || !isFirstChild(node)) {
            outNode.beforeOpen = prefix;
            if (node.isTextOnly) {
                outNode.beforeText = prefix;
            }
        }
        if (hasInnerFormatting(node, profile)) {
            if (!node.isTextOnly) {
                outNode.beforeText = prefix + profile.indent(1);
            }
            outNode.beforeClose = prefix;
        }
    }
    return outNode;
}
function shouldFormatNode(node, profile) {
    if (!profile.get("format")) {
        return false;
    }
    if (node.parent.isTextOnly && node.parent.children.length === 1 && parse(node.parent.value).fields.length) {
        return false;
    }
    return isInline(node, profile) ? shouldFormatInline(node, profile) : true;
}
function shouldFormatInline(node, profile) {
    if (!isInline(node, profile)) {
        return false;
    }
    if (isPseudoSnippet(node)) {
        return true;
    }
    if (node.childIndex === 0) {
        var next = node;
        while (next = next.nextSibling) {
            if (!isInline(next, profile)) {
                return true;
            }
        }
    } else if (!isInline(node.previousSibling, profile)) {
        return true;
    }
    if (profile.get("inlineBreak")) {
        var adjacentInline = 1;
        var before = node, after = node;
        while (isInlineElement(before = before.previousSibling, profile)) {
            adjacentInline++;
        }
        while (isInlineElement(after = after.nextSibling, profile)) {
            adjacentInline++;
        }
        if (adjacentInline >= profile.get("inlineBreak")) {
            return true;
        }
    }
    for (var i = 0, il = node.children.length; i < il; i++) {
        if (shouldFormatNode(node.children[i], profile)) {
            return true;
        }
    }
    return false;
}
function hasInnerFormatting(node, profile) {
    var nodeName = (node.name || "").toLowerCase();
    if (profile.get("formatForce").indexOf(nodeName) !== -1) {
        return true;
    }
    for (var i = 0; i < node.children.length; i++) {
        if (shouldFormatNode(node.children[i], profile)) {
            return true;
        }
    }
    return false;
}
function formatAttributes(outNode, profile) {
    var node = outNode.node;
    return node.attributes.map(function (attr) {
        if (attr.options.implied && attr.value == null) {
            return null;
        }
        var attrName = profile.attribute(attr.name);
        var attrValue = null;
        if (attr.options.boolean || profile.get("booleanAttributes").indexOf(attrName.toLowerCase()) !== -1) {
            if (profile.get("compactBooleanAttributes") && attr.value == null) {
                return " " + attrName;
            } else if (attr.value == null) {
                attrValue = attrName;
            }
        }
        if (attrValue == null) {
            attrValue = outNode.renderFields(attr.value);
        }
        return attr.options.before && attr.options.after ? " " + attrName + "=" + (attr.options.before + attrValue + attr.options.after) : " " + attrName + "=" + profile.quote(attrValue);
    }).join("");
}
function isInline(node, profile) {
    return node && node.isTextOnly || isInlineElement(node, profile);
}
function isInlineElement(node, profile) {
    return node && profile.isInline(node);
}
function getIndentLevel(node, profile) {
    var skip = profile.get("formatSkip") || [];
    var level = node.parent.isTextOnly ? -2 : -1;
    var ctx = node;
    while (ctx = ctx.parent) {
        if (skip.indexOf((ctx.name || "").toLowerCase()) === -1) {
            level++;
        }
    }
    return level < 0 ? 0 : level;
}
function commentNode(outNode, options) {
    var node = outNode.node;
    if (!options.enabled || !options.trigger || !node.name) {
        return;
    }
    var attrs = outNode.node.attributes.reduce(function (out2, attr) {
        if (attr.name && attr.value != null) {
            out2[attr.name.toUpperCase().replace(/-/g, "_")] = attr.value;
        }
        return out2;
    }, {});
    for (var i = 0, il = options.trigger.length; i < il; i++) {
        if (options.trigger[i].toUpperCase() in attrs) {
            outNode.open = template(options.before, attrs) + outNode.open;
            if (outNode.close) {
                outNode.close += template(options.after, attrs);
            }
            break;
        }
    }
}
function getFormatOptions(options) {
    var format = Object.assign({}, options && options.format);
    format.comment = Object.assign({}, commentOptions, format.comment);
    return format;
}
var reId = /^id$/i;
var reClass = /^class$/i;
var defaultAttrOptions = {
    primary: function (attrs) {
        return attrs.join("");
    },
    secondary: function (attrs) {
        return attrs.map(function (attr) {
            return attr.isBoolean ? attr.name : attr.name + "=" + attr.value;
        }).join(", ");
    }
};
var defaultNodeOptions = {
    open: null,
    close: null,
    omitName: /^div$/i,
    attributes: defaultAttrOptions
};
function indentFormat(outNode, profile, options) {
    options = Object.assign({}, defaultNodeOptions, options);
    var node = outNode.node;
    outNode.indent = profile.indent(getIndentLevel$1(node));
    outNode.newline = "\n";
    if (!isRoot(node.parent) || !isFirstChild(node)) {
        outNode.beforeOpen = outNode.newline + outNode.indent;
    }
    if (node.name) {
        var data = Object.assign({
            NAME: profile.name(node.name),
            SELF_CLOSE: node.selfClosing ? options.selfClose : null
        }, getAttributes(outNode, profile, options.attributes));
        if (options.omitName && options.omitName.test(data.NAME) && data.PRIMARY_ATTRS) {
            data.NAME = null;
        }
        if (options.open != null) {
            outNode.open = template(options.open, data);
        }
        if (options.close != null) {
            outNode.close = template(options.close, data);
        }
    }
    return outNode;
}
function getAttributes(outNode, profile, options) {
    options = Object.assign({}, defaultAttrOptions, options);
    var primary = [], secondary = [];
    var node = outNode.node;
    node.attributes.forEach(function (attr) {
        if (attr.options.implied && attr.value == null) {
            return null;
        }
        var name = profile.attribute(attr.name);
        var value = outNode.renderFields(attr.value);
        if (reId.test(name)) {
            value && primary.push("#" + value);
        } else if (reClass.test(name)) {
            value && primary.push("." + value.replace(/\s+/g, "."));
        } else {
            var isBoolean = attr.value == null && (attr.options.boolean || profile.get("booleanAttributes").indexOf(name.toLowerCase()) !== -1);
            secondary.push({ name, value, isBoolean });
        }
    });
    return {
        PRIMARY_ATTRS: options.primary(primary) || null,
        SECONDARY_ATTRS: options.secondary(secondary) || null
    };
}
function getIndentLevel$1(node) {
    var level = node.parent.isTextOnly ? -2 : -1;
    var ctx = node;
    while (ctx = ctx.parent) {
        level++;
    }
    return level < 0 ? 0 : level;
}
var reNl = /\n|\r/;
function haml(tree, profile, options) {
    options = options || {};
    var nodeOptions = {
        open: "[%NAME][PRIMARY_ATTRS][(SECONDARY_ATTRS)][SELF_CLOSE]",
        selfClose: "/",
        attributes: {
            secondary: function secondary(attrs) {
                return attrs.map(function (attr) {
                    return attr.isBoolean ? "" + attr.name + (profile.get("compactBooleanAttributes") ? "" : "=true") : attr.name + "=" + profile.quote(attr.value);
                }).join(" ");
            }
        }
    };
    return render(tree, options.field, function (outNode) {
        outNode = indentFormat(outNode, profile, nodeOptions);
        outNode = updateFormatting(outNode, profile);
        if (!handlePseudoSnippet(outNode)) {
            var node = outNode.node;
            if (node.value || !node.children.length && !node.selfClosing) {
                outNode.text = outNode.renderFields(formatNodeValue(node, profile));
            }
        }
        return outNode;
    });
}
function updateFormatting(outNode, profile) {
    var node = outNode.node;
    if (!node.isTextOnly && node.value) {
        outNode.beforeText = reNl.test(node.value) ? outNode.newline + outNode.indent + profile.indent(1) : " ";
    }
    return outNode;
}
function formatNodeValue(node, profile) {
    if (node.value != null && reNl.test(node.value)) {
        var lines = splitByLines$1(node.value);
        var indent = profile.indent(1);
        var maxLength = lines.reduce(function (prev, line) {
            return Math.max(prev, line.length);
        }, 0);
        return lines.map(function (line, i) {
            return "" + (i ? indent : "") + pad$1(line, maxLength) + " |";
        }).join("\n");
    }
    return node.value;
}
function pad$1(text, len) {
    while (text.length < len) {
        text += " ";
    }
    return text;
}
var reNl$1 = /\n|\r/;
var secondaryAttrs = {
    none: "[ SECONDARY_ATTRS]",
    round: "[(SECONDARY_ATTRS)]",
    curly: "[{SECONDARY_ATTRS}]",
    square: "[[SECONDARY_ATTRS]"
};
function slim(tree, profile, options) {
    options = options || {};
    var SECONDARY_ATTRS = options.attributeWrap && secondaryAttrs[options.attributeWrap] || secondaryAttrs.none;
    var booleanAttr = SECONDARY_ATTRS === secondaryAttrs.none ? function (attr) {
        return attr.name + "=true";
    } : function (attr) {
        return attr.name;
    };
    var nodeOptions = {
        open: "[NAME][PRIMARY_ATTRS]" + SECONDARY_ATTRS + "[SELF_CLOSE]",
        selfClose: "/",
        attributes: {
            secondary: function secondary(attrs) {
                return attrs.map(function (attr) {
                    return attr.isBoolean ? booleanAttr(attr) : attr.name + "=" + profile.quote(attr.value);
                }).join(" ");
            }
        }
    };
    return render(tree, options.field, function (outNode) {
        outNode = indentFormat(outNode, profile, nodeOptions);
        outNode = updateFormatting$1(outNode, profile);
        if (!handlePseudoSnippet(outNode)) {
            var node = outNode.node;
            if (node.value || !node.children.length && !node.selfClosing) {
                outNode.text = outNode.renderFields(formatNodeValue$1(node, profile));
            }
        }
        return outNode;
    });
}
function updateFormatting$1(outNode, profile) {
    var node = outNode.node;
    var parent = node.parent;
    if (profile.get("inlineBreak") === 0 && isInline$1(node, profile) && !isRoot(parent) && parent.value == null && parent.children.length === 1) {
        outNode.beforeOpen = ": ";
    }
    if (!node.isTextOnly && node.value) {
        outNode.beforeText = reNl$1.test(node.value) ? outNode.newline + outNode.indent + profile.indent(1) : " ";
    }
    return outNode;
}
function formatNodeValue$1(node, profile) {
    if (node.value != null && reNl$1.test(node.value)) {
        var indent = profile.indent(1);
        return splitByLines$1(node.value).map(function (line, i) {
            return "" + indent + (i ? " " : "|") + " " + line;
        }).join("\n");
    }
    return node.value;
}
function isInline$1(node, profile) {
    return node && (node.isTextOnly || profile.isInline(node));
}
var reNl$2 = /\n|\r/;
function pug(tree, profile, options) {
    options = options || {};
    var nodeOptions = {
        open: "[NAME][PRIMARY_ATTRS][(SECONDARY_ATTRS)]",
        attributes: {
            secondary: function secondary(attrs) {
                return attrs.map(function (attr) {
                    return attr.isBoolean ? attr.name : attr.name + "=" + profile.quote(attr.value);
                }).join(", ");
            }
        }
    };
    return render(tree, options.field, function (outNode) {
        outNode = indentFormat(outNode, profile, nodeOptions);
        outNode = updateFormatting$2(outNode, profile);
        if (!handlePseudoSnippet(outNode)) {
            var node = outNode.node;
            if (node.value || !node.children.length && !node.selfClosing) {
                outNode.text = outNode.renderFields(formatNodeValue$2(node, profile));
            }
        }
        return outNode;
    });
}
function updateFormatting$2(outNode, profile) {
    var node = outNode.node;
    if (!node.isTextOnly && node.value) {
        outNode.beforeText = reNl$2.test(node.value) ? outNode.newline + outNode.indent + profile.indent(1) : " ";
    }
    return outNode;
}
function formatNodeValue$2(node, profile) {
    if (node.value != null && reNl$2.test(node.value)) {
        var indent = profile.indent(1);
        return splitByLines$1(node.value).map(function (line) {
            return indent + "| " + line;
        }).join("\n");
    }
    return node.value;
}
var supportedSyntaxes = { html, haml, slim, pug };
function index$6(tree, profile, syntax, options) {
    if (typeof syntax === "object") {
        options = syntax;
        syntax = null;
    }
    if (!supports$1(syntax)) {
        syntax = "html";
    }
    return supportedSyntaxes[syntax](tree, profile, options);
}
function supports$1(syntax) {
    return !!syntax && syntax in supportedSyntaxes;
}
var inlineElements = new Set("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,select,small,span,strike,strong,sub,sup,textarea,tt,u,var".split(","));
var elementMap = {
    p: "span",
    ul: "li",
    ol: "li",
    table: "tr",
    tr: "td",
    tbody: "tr",
    thead: "tr",
    tfoot: "tr",
    colgroup: "col",
    select: "option",
    optgroup: "option",
    audio: "source",
    video: "source",
    object: "param",
    map: "area"
};
function resolveImplicitName(parentName) {
    parentName = (parentName || "").toLowerCase();
    return elementMap[parentName] || (inlineElements.has(parentName) ? "span" : "div");
}
var implicitTags = function (tree) {
    tree.walk(function (node) {
        if (node.name == null && node.attributes.length) {
            node.name = resolveImplicitName(node.parent.name);
        }
    });
    return tree;
};
function findUnescapedTokens(str2, token) {
    var result = new Set();
    var tlen = token.length;
    var pos2 = 0;
    while ((pos2 = str2.indexOf(token, pos2)) !== -1) {
        result.add(pos2);
        pos2 += tlen;
    }
    if (result.size) {
        var pos$1 = 0;
        var len = str2.length;
        while (pos$1 < len) {
            if (str2[pos$1++] === "\\") {
                result.delete(pos$1++);
            }
        }
    }
    return Array.from(result).map(function (ix) {
        return range(ix, tlen);
    });
}
function replaceRanges(str2, ranges, value) {
    for (var i = ranges.length - 1; i >= 0; i--) {
        var r2 = ranges[i];
        var offset = 0;
        var offsetLength = 0;
        var descendingOrder = false;
        if (str2.substr(r2[0] + r2[1], 1) === "@") {
            if (str2.substr(r2[0] + r2[1] + 1, 1) === "-") {
                descendingOrder = true;
            }
            var matches = str2.substr(r2[0] + r2[1] + 1 + Number(descendingOrder)).match(/^(\d+)/);
            if (matches) {
                offsetLength = matches[1].length + 1 + Number(descendingOrder);
                offset = parseInt(matches[1]) - 1;
            } else {
                offsetLength = 2;
            }
        }
        str2 = str2.substring(0, r2[0]) + (typeof value === "function" ? value(str2.substr(r2[0], r2[1]), offset, descendingOrder) : value) + str2.substring(r2[0] + r2[1] + offsetLength);
    }
    return str2;
}
function range(start, length) {
    return [start, length];
}
var numberingToken = "$";
var applyNumbering = function (tree) {
    tree.walk(applyNumbering$1);
    return tree;
};
function applyNumbering$1(node) {
    var repeater = findRepeater(node);
    if (repeater && repeater.value != null) {
        var value = repeater.value;
        var count = repeater.count;
        node.name = replaceNumbering(node.name, value, count);
        node.value = replaceNumbering(node.value, value, count);
        node.attributes.forEach(function (attr) {
            var copy = node.getAttribute(attr.name).clone();
            copy.name = replaceNumbering(attr.name, value, count);
            copy.value = replaceNumbering(attr.value, value, count);
            node.replaceAttribute(attr.name, copy);
        });
    }
    return node;
}
function findRepeater(node) {
    while (node) {
        if (node.repeat) {
            return node.repeat;
        }
        node = node.parent;
    }
}
function replaceNumbering(str2, value, count) {
    if (typeof str2 === "string") {
        var ranges = getNumberingRanges(str2);
        return replaceNumberingRanges(str2, ranges, value, count);
    }
    return str2;
}
function getNumberingRanges(str2) {
    return findUnescapedTokens(str2 || "", numberingToken).reduce(function (out2, range$$1) {
        if (!/[#{]/.test(str2[range$$1[0] + 1] || "")) {
            var lastRange = out2[out2.length - 1];
            if (lastRange && lastRange[0] + lastRange[1] === range$$1[0]) {
                lastRange[1] += range$$1[1];
            } else {
                out2.push(range$$1);
            }
        }
        return out2;
    }, []);
}
function replaceNumberingRanges(str2, ranges, value, count) {
    var replaced = replaceRanges(str2, ranges, function (token, offset, descendingOrder) {
        var _value = descendingOrder ? String(offset + count - value + 1) : String(value + offset);
        while (_value.length < token.length) {
            _value = "0" + _value;
        }
        return _value;
    });
    return unescapeString(replaced);
}
function unescapeString(str2) {
    var i = 0, result = "";
    var len = str2.length;
    while (i < len) {
        var ch = str2[i++];
        result += ch === "\\" ? str2[i++] || "" : ch;
    }
    return result;
}
var placeholder = "$#";
var caret = "|";
var reUrl = /^((?:https?|ftp|file):\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
var reEmail = /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/;
var reProto = /^([a-z]+:)?\/\//i;
function prepare(tree, amount) {
    amount = amount || 1;
    tree.walk(function (node) {
        if (node.repeat && node.repeat.count === null) {
            for (var i = 0; i < amount; i++) {
                var clone = node.clone(true);
                clone.repeat.implicit = true;
                clone.repeat.count = amount;
                clone.repeat.value = i + 1;
                clone.repeat.index = i;
                node.parent.insertBefore(clone, node);
            }
            node.remove();
        }
    });
    return tree;
}
function insert(tree, content) {
    if (Array.isArray(content) && content.length) {
        var updated = false;
        tree.walk(function (node) {
            if (node.repeat && node.repeat.implicit) {
                updated = true;
                insertContent(node, content[node.repeat.index]);
            }
        });
        if (!updated) {
            setNodeContent(findDeepestNode$1(tree), content.join("\n"));
        }
    }
    return tree;
}
function insertContent(node, content) {
    var inserted = insertContentIntoPlaceholder(node, content);
    node.walk(function (child) {
        return inserted |= insertContentIntoPlaceholder(child, content);
    });
    if (!inserted) {
        setNodeContent(findDeepestNode$1(node), content);
    }
    return node;
}
function insertContentIntoPlaceholder(node, content) {
    var state = { replaced: false };
    node.value = replacePlaceholder(node.value, content, state);
    node.attributes.forEach(function (attr) {
        if (attr.value) {
            node.setAttribute(attr.name, replacePlaceholder(attr.value, content, state));
        }
    });
    return state.replaced;
}
function replacePlaceholder(str2, value, _state) {
    if (typeof str2 === "string") {
        var ranges = findUnescapedTokens(str2, placeholder);
        if (ranges.length) {
            if (_state) {
                _state.replaced = true;
            }
            str2 = replaceRanges(str2, ranges, value);
        }
    }
    return str2;
}
function findDeepestNode$1(node) {
    while (node.children.length) {
        node = node.children[node.children.length - 1];
    }
    return node;
}
function setNodeContent(node, content) {
    if (node.value) {
        var ranges = findUnescapedTokens(node.value, caret);
        if (ranges.length) {
            node.value = replaceRanges(node.value, ranges, content);
            return;
        }
    }
    if (node.name.toLowerCase() === "a" || node.hasAttribute("href")) {
        if (reUrl.test(content)) {
            node.setAttribute("href", (reProto.test(content) ? "" : "http://") + content);
        } else if (reEmail.test(content)) {
            node.setAttribute("href", "mailto:" + content);
        }
    }
    node.value = content;
}
var defaultOptions$3 = {
    element: "__",
    modifier: "_"
};
var reElement = /^(-+)([a-z0-9]+[a-z0-9-]*)/i;
var reModifier = /^(_+)([a-z0-9]+[a-z0-9-_]*)/i;
var blockCandidates1 = function (className) {
    return /^[a-z]\-/i.test(className);
};
var blockCandidates2 = function (className) {
    return /^[a-z]/i.test(className);
};
var bem = function (tree, options) {
    options = Object.assign({}, defaultOptions$3, options);
    tree.walk(function (node) {
        return expandClassNames(node);
    });
    var lookup = createBlockLookup(tree);
    tree.walk(function (node) {
        return expandShortNotation(node, lookup, options);
    });
    return tree;
};
function expandClassNames(node, options) {
    var classNames = node.classList.reduce(function (out2, cl2) {
        var ix = cl2.indexOf("_");
        if (ix > 0 && !cl2.startsWith("-")) {
            out2.add(cl2.slice(0, ix));
            out2.add(cl2.slice(ix));
            return out2;
        }
        return out2.add(cl2);
    }, new Set());
    if (classNames.size) {
        node.setAttribute("class", Array.from(classNames).join(" "));
    }
}
function expandShortNotation(node, lookup, options) {
    var classNames = node.classList.reduce(function (out2, cl2) {
        var prefix, m2;
        var originalClass = cl2;
        if (m2 = cl2.match(reElement)) {
            prefix = getBlockName(node, lookup, m2[1]) + options.element + m2[2];
            out2.add(prefix);
            cl2 = cl2.slice(m2[0].length);
        }
        if (m2 = cl2.match(reModifier)) {
            if (!prefix) {
                prefix = getBlockName(node, lookup, m2[1]);
                out2.add(prefix);
            }
            out2.add("" + prefix + options.modifier + m2[2]);
            cl2 = cl2.slice(m2[0].length);
        }
        if (cl2 === originalClass) {
            out2.add(originalClass);
        }
        return out2;
    }, new Set());
    var arrClassNames = Array.from(classNames).filter(Boolean);
    if (arrClassNames.length) {
        node.setAttribute("class", arrClassNames.join(" "));
    }
}
function createBlockLookup(tree) {
    var lookup = new Map();
    tree.walk(function (node) {
        var classNames = node.classList;
        if (classNames.length) {
            lookup.set(node, find(classNames, blockCandidates1) || find(classNames, blockCandidates2) || lookup.get(node.parent));
        }
    });
    return lookup;
}
function getBlockName(node, lookup, prefix) {
    var depth = prefix.length > 1 ? prefix.length : 0;
    while (node.parent && node.parent.parent && depth--) {
        node = node.parent;
    }
    return lookup.get(node) || "";
}
function find(arr, filter) {
    for (var i = 0; i < arr.length; i++) {
        if (reElement.test(arr[i]) || reModifier.test(arr[i])) {
            break;
        }
        if (filter(arr[i])) {
            return arr[i];
        }
    }
}
var jsx = function (tree) {
    tree.walk(function (node) {
        replace(node, "class", "className");
        replace(node, "for", "htmlFor");
    });
    return tree;
};
function replace(node, oldName, newName) {
    var attr = node.getAttribute(oldName);
    if (attr) {
        attr.name = newName;
    }
}
var reSupporterNames = /^xsl:(variable|with\-param)$/i;
var xsl = function (tree) {
    tree.walk(function (node) {
        if (reSupporterNames.test(node.name || "") && (node.children.length || node.value)) {
            node.removeAttribute("select");
        }
    });
    return tree;
};
var supportedAddons = { bem, jsx, xsl };
var addons = function (tree, addons2) {
    Object.keys(addons2 || {}).forEach(function (key) {
        if (key in supportedAddons) {
            var addonOpt = typeof addons2[key] === "object" ? addons2[key] : null;
            tree = tree.use(supportedAddons[key], addonOpt);
        }
    });
    return tree;
};
var index$7 = function (tree, content, appliedAddons) {
    if (typeof content === "string") {
        content = [content];
    } else if (content && typeof content === "object" && !Array.isArray(content)) {
        appliedAddons = content;
        content = null;
    }
    return tree.use(implicitTags).use(prepare, Array.isArray(content) ? content.length : null).use(applyNumbering).use(insert, content).use(addons, appliedAddons);
};
var a = "a[href]";
var abbr = "abbr[title]";
var base = "base[href]/";
var basefont = "basefont/";
var br = "br/";
var frame = "frame/";
var hr = "hr/";
var bdo = "bdo[dir]";
var col = "col/";
var link = "link[rel=stylesheet href]/";
var meta = "meta/";
var style = "style";
var script = "script[!src]";
var img = "img[src alt]/";
var picture = "picture";
var iframe = "iframe[src frameborder=0]";
var embed = "embed[src type]/";
var object = "object[data type]";
var param = "param[name value]/";
var map = "map[name]";
var area = "area[shape coords href alt]/";
var form = "form[action]";
var label = "label[for]";
var input = "input[type=${1:text}]/";
var inp = "input[name=${1} id=${1}]";
var isindex = "isindex/";
var select = "select[name=${1} id=${1}]";
var textarea = "textarea[name=${1} id=${1} cols=${2:30} rows=${3:10}]";
var marquee = "marquee[behavior direction]";
var video = "video[src]";
var audio = "audio[src]";
var keygen = "keygen/";
var command = "command/";
var bq = "blockquote";
var fig = "figure";
var figc = "figcaption";
var pic = "picture";
var ifr = "iframe";
var emb = "embed";
var obj = "object";
var cap = "caption";
var colg = "colgroup";
var fst$1 = "fieldset";
var btn = "button";
var optg = "optgroup";
var tarea = "textarea";
var leg = "legend";
var sect = "section";
var art = "article";
var hdr = "header";
var ftr = "footer";
var adr = "address";
var dlg = "dialog";
var str = "strong";
var prog = "progress";
var mn = "main";
var tem = "template";
var fset = "fieldset";
var datag = "datagrid";
var datal = "datalist";
var kg = "keygen";
var out = "output";
var det = "details";
var cmd = "command";
var doc = "html[lang=${lang}]>(head>meta[charset=${charset}]+meta:vp+title{${1:Document}})+body";
var c$1 = "{<!-- ${0} -->}";
var htmlSnippet = {
    a,
    "a:blank": "a[href='http://${0}' target='_blank' rel='noopener noreferrer']",
    "a:link": "a[href='http://${0}']",
    "a:mail": "a[href='mailto:${0}']",
    "a:tel": "a[href='tel:+${0}']",
    abbr,
    "acr|acronym": "acronym[title]",
    base,
    basefont,
    br,
    frame,
    hr,
    bdo,
    "bdo:r": "bdo[dir=rtl]",
    "bdo:l": "bdo[dir=ltr]",
    col,
    link,
    "link:css": "link[href='${1:style}.css']",
    "link:print": "link[href='${1:print}.css' media=print]",
    "link:favicon": "link[rel='shortcut icon' type=image/x-icon href='${1:favicon.ico}']",
    "link:mf|link:manifest": "link[rel='manifest' href='${1:manifest.json}']",
    "link:touch": "link[rel=apple-touch-icon href='${1:favicon.png}']",
    "link:rss": "link[rel=alternate type=application/rss+xml title=RSS href='${1:rss.xml}']",
    "link:atom": "link[rel=alternate type=application/atom+xml title=Atom href='${1:atom.xml}']",
    "link:im|link:import": "link[rel=import href='${1:component}.html']",
    meta,
    "meta:utf": "meta[http-equiv=Content-Type content='text/html;charset=UTF-8']",
    "meta:vp": "meta[name=viewport content='width=${1:device-width}, initial-scale=${2:1.0}']",
    "meta:compat": "meta[http-equiv=X-UA-Compatible content='${1:IE=7}']",
    "meta:edge": "meta:compat[content='${1:ie=edge}']",
    "meta:redirect": "meta[http-equiv=refresh content='0; url=${1:http://example.com}']",
    style,
    script,
    "script:src": "script[src]",
    img,
    "img:s|img:srcset": "img[srcset src alt]",
    "img:z|img:sizes": "img[sizes srcset src alt]",
    picture,
    "src|source": "source/",
    "src:sc|source:src": "source[src type]",
    "src:s|source:srcset": "source[srcset]",
    "src:t|source:type": "source[srcset type='${1:image/}']",
    "src:z|source:sizes": "source[sizes srcset]",
    "src:m|source:media": "source[media='(${1:min-width: })' srcset]",
    "src:mt|source:media:type": "source:media[type='${2:image/}']",
    "src:mz|source:media:sizes": "source:media[sizes srcset]",
    "src:zt|source:sizes:type": "source[sizes srcset type='${1:image/}']",
    iframe,
    embed,
    object,
    param,
    map,
    area,
    "area:d": "area[shape=default]",
    "area:c": "area[shape=circle]",
    "area:r": "area[shape=rect]",
    "area:p": "area[shape=poly]",
    form,
    "form:get": "form[method=get]",
    "form:post": "form[method=post]",
    label,
    input,
    inp,
    "input:h|input:hidden": "input[type=hidden name]",
    "input:t|input:text": "inp[type=text]",
    "input:search": "inp[type=search]",
    "input:email": "inp[type=email]",
    "input:url": "inp[type=url]",
    "input:p|input:password": "inp[type=password]",
    "input:datetime": "inp[type=datetime]",
    "input:date": "inp[type=date]",
    "input:datetime-local": "inp[type=datetime-local]",
    "input:month": "inp[type=month]",
    "input:week": "inp[type=week]",
    "input:time": "inp[type=time]",
    "input:tel": "inp[type=tel]",
    "input:number": "inp[type=number]",
    "input:color": "inp[type=color]",
    "input:c|input:checkbox": "inp[type=checkbox]",
    "input:r|input:radio": "inp[type=radio]",
    "input:range": "inp[type=range]",
    "input:f|input:file": "inp[type=file]",
    "input:s|input:submit": "input[type=submit value]",
    "input:i|input:image": "input[type=image src alt]",
    "input:b|input:button": "input[type=button value]",
    "input:reset": "input:button[type=reset]",
    isindex,
    select,
    "select:d|select:disabled": "select[disabled.]",
    "opt|option": "option[value]",
    textarea,
    marquee,
    "menu:c|menu:context": "menu[type=context]",
    "menu:t|menu:toolbar": "menu[type=toolbar]",
    video,
    audio,
    "html:xml": "html[xmlns=http://www.w3.org/1999/xhtml]",
    keygen,
    command,
    "btn:s|button:s|button:submit": "button[type=submit]",
    "btn:r|button:r|button:reset": "button[type=reset]",
    "btn:d|button:d|button:disabled": "button[disabled.]",
    "fst:d|fset:d|fieldset:d|fieldset:disabled": "fieldset[disabled.]",
    bq,
    fig,
    figc,
    pic,
    ifr,
    emb,
    obj,
    cap,
    colg,
    fst: fst$1,
    btn,
    optg,
    tarea,
    leg,
    sect,
    art,
    hdr,
    ftr,
    adr,
    dlg,
    str,
    prog,
    mn,
    tem,
    fset,
    datag,
    datal,
    kg,
    out,
    det,
    cmd,
    "ri:d|ri:dpr": "img:s",
    "ri:v|ri:viewport": "img:z",
    "ri:a|ri:art": "pic>src:m+img",
    "ri:t|ri:type": "pic>src:t+img",
    "!!!": "{<!DOCTYPE html>}",
    doc,
    "!|html:5": "!!!+doc",
    c: c$1,
    "cc:ie": "{<!--[if IE]>${0}<![endif]-->}",
    "cc:noie": "{<!--[if !IE]><!-->${0}<!--<![endif]-->}"
};
var latin = {
    common: ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipisicing", "elit"],
    words: [
        "exercitationem",
        "perferendis",
        "perspiciatis",
        "laborum",
        "eveniet",
        "sunt",
        "iure",
        "nam",
        "nobis",
        "eum",
        "cum",
        "officiis",
        "excepturi",
        "odio",
        "consectetur",
        "quasi",
        "aut",
        "quisquam",
        "vel",
        "eligendi",
        "itaque",
        "non",
        "odit",
        "tempore",
        "quaerat",
        "dignissimos",
        "facilis",
        "neque",
        "nihil",
        "expedita",
        "vitae",
        "vero",
        "ipsum",
        "nisi",
        "animi",
        "cumque",
        "pariatur",
        "velit",
        "modi",
        "natus",
        "iusto",
        "eaque",
        "sequi",
        "illo",
        "sed",
        "ex",
        "et",
        "voluptatibus",
        "tempora",
        "veritatis",
        "ratione",
        "assumenda",
        "incidunt",
        "nostrum",
        "placeat",
        "aliquid",
        "fuga",
        "provident",
        "praesentium",
        "rem",
        "necessitatibus",
        "suscipit",
        "adipisci",
        "quidem",
        "possimus",
        "voluptas",
        "debitis",
        "sint",
        "accusantium",
        "unde",
        "sapiente",
        "voluptate",
        "qui",
        "aspernatur",
        "laudantium",
        "soluta",
        "amet",
        "quo",
        "aliquam",
        "saepe",
        "culpa",
        "libero",
        "ipsa",
        "dicta",
        "reiciendis",
        "nesciunt",
        "doloribus",
        "autem",
        "impedit",
        "minima",
        "maiores",
        "repudiandae",
        "ipsam",
        "obcaecati",
        "ullam",
        "enim",
        "totam",
        "delectus",
        "ducimus",
        "quis",
        "voluptates",
        "dolores",
        "molestiae",
        "harum",
        "dolorem",
        "quia",
        "voluptatem",
        "molestias",
        "magni",
        "distinctio",
        "omnis",
        "illum",
        "dolorum",
        "voluptatum",
        "ea",
        "quas",
        "quam",
        "corporis",
        "quae",
        "blanditiis",
        "atque",
        "deserunt",
        "laboriosam",
        "earum",
        "consequuntur",
        "hic",
        "cupiditate",
        "quibusdam",
        "accusamus",
        "ut",
        "rerum",
        "error",
        "minus",
        "eius",
        "ab",
        "ad",
        "nemo",
        "fugit",
        "officia",
        "at",
        "in",
        "id",
        "quos",
        "reprehenderit",
        "numquam",
        "iste",
        "fugiat",
        "sit",
        "inventore",
        "beatae",
        "repellendus",
        "magnam",
        "recusandae",
        "quod",
        "explicabo",
        "doloremque",
        "aperiam",
        "consequatur",
        "asperiores",
        "commodi",
        "optio",
        "dolor",
        "labore",
        "temporibus",
        "repellat",
        "veniam",
        "architecto",
        "est",
        "esse",
        "mollitia",
        "nulla",
        "a",
        "similique",
        "eos",
        "alias",
        "dolore",
        "tenetur",
        "deleniti",
        "porro",
        "facere",
        "maxime",
        "corrupti"
    ]
};
var ru = {
    common: ["далеко-далеко", "за", "словесными", "горами", "в стране", "гласных", "и согласных", "живут", "рыбные", "тексты"],
    words: [
        "вдали",
        "от всех",
        "они",
        "буквенных",
        "домах",
        "на берегу",
        "семантика",
        "большого",
        "языкового",
        "океана",
        "маленький",
        "ручеек",
        "даль",
        "журчит",
        "по всей",
        "обеспечивает",
        "ее",
        "всеми",
        "необходимыми",
        "правилами",
        "эта",
        "парадигматическая",
        "страна",
        "которой",
        "жаренные",
        "предложения",
        "залетают",
        "прямо",
        "рот",
        "даже",
        "всемогущая",
        "пунктуация",
        "не",
        "имеет",
        "власти",
        "над",
        "рыбными",
        "текстами",
        "ведущими",
        "безорфографичный",
        "образ",
        "жизни",
        "однажды",
        "одна",
        "маленькая",
        "строчка",
        "рыбного",
        "текста",
        "имени",
        "lorem",
        "ipsum",
        "решила",
        "выйти",
        "большой",
        "мир",
        "грамматики",
        "великий",
        "оксмокс",
        "предупреждал",
        "о",
        "злых",
        "запятых",
        "диких",
        "знаках",
        "вопроса",
        "коварных",
        "точках",
        "запятой",
        "но",
        "текст",
        "дал",
        "сбить",
        "себя",
        "толку",
        "он",
        "собрал",
        "семь",
        "своих",
        "заглавных",
        "букв",
        "подпоясал",
        "инициал",
        "за",
        "пояс",
        "пустился",
        "дорогу",
        "взобравшись",
        "первую",
        "вершину",
        "курсивных",
        "гор",
        "бросил",
        "последний",
        "взгляд",
        "назад",
        "силуэт",
        "своего",
        "родного",
        "города",
        "буквоград",
        "заголовок",
        "деревни",
        "алфавит",
        "подзаголовок",
        "своего",
        "переулка",
        "грустный",
        "реторический",
        "вопрос",
        "скатился",
        "его",
        "щеке",
        "продолжил",
        "свой",
        "путь",
        "дороге",
        "встретил",
        "рукопись",
        "она",
        "предупредила",
        "моей",
        "все",
        "переписывается",
        "несколько",
        "раз",
        "единственное",
        "что",
        "меня",
        "осталось",
        "это",
        "приставка",
        "возвращайся",
        "ты",
        "лучше",
        "свою",
        "безопасную",
        "страну",
        "послушавшись",
        "рукописи",
        "наш",
        "продолжил",
        "свой",
        "путь",
        "вскоре",
        "ему",
        "повстречался",
        "коварный",
        "составитель",
        "рекламных",
        "текстов",
        "напоивший",
        "языком",
        "речью",
        "заманивший",
        "свое",
        "агентство",
        "которое",
        "использовало",
        "снова",
        "снова",
        "своих",
        "проектах",
        "если",
        "переписали",
        "то",
        "живет",
        "там",
        "до",
        "сих",
        "пор"
    ]
};
var sp = {
    common: ["mujer", "uno", "dolor", "más", "de", "poder", "mismo", "si"],
    words: [
        "ejercicio",
        "preferencia",
        "perspicacia",
        "laboral",
        "paño",
        "suntuoso",
        "molde",
        "namibia",
        "planeador",
        "mirar",
        "demás",
        "oficinista",
        "excepción",
        "odio",
        "consecuencia",
        "casi",
        "auto",
        "chicharra",
        "velo",
        "elixir",
        "ataque",
        "no",
        "odio",
        "temporal",
        "cuórum",
        "dignísimo",
        "facilismo",
        "letra",
        "nihilista",
        "expedición",
        "alma",
        "alveolar",
        "aparte",
        "león",
        "animal",
        "como",
        "paria",
        "belleza",
        "modo",
        "natividad",
        "justo",
        "ataque",
        "séquito",
        "pillo",
        "sed",
        "ex",
        "y",
        "voluminoso",
        "temporalidad",
        "verdades",
        "racional",
        "asunción",
        "incidente",
        "marejada",
        "placenta",
        "amanecer",
        "fuga",
        "previsor",
        "presentación",
        "lejos",
        "necesariamente",
        "sospechoso",
        "adiposidad",
        "quindío",
        "pócima",
        "voluble",
        "débito",
        "sintió",
        "accesorio",
        "falda",
        "sapiencia",
        "volutas",
        "queso",
        "permacultura",
        "laudo",
        "soluciones",
        "entero",
        "pan",
        "litro",
        "tonelada",
        "culpa",
        "libertario",
        "mosca",
        "dictado",
        "reincidente",
        "nascimiento",
        "dolor",
        "escolar",
        "impedimento",
        "mínima",
        "mayores",
        "repugnante",
        "dulce",
        "obcecado",
        "montaña",
        "enigma",
        "total",
        "deletéreo",
        "décima",
        "cábala",
        "fotografía",
        "dolores",
        "molesto",
        "olvido",
        "paciencia",
        "resiliencia",
        "voluntad",
        "molestias",
        "magnífico",
        "distinción",
        "ovni",
        "marejada",
        "cerro",
        "torre",
        "y",
        "abogada",
        "manantial",
        "corporal",
        "agua",
        "crepúsculo",
        "ataque",
        "desierto",
        "laboriosamente",
        "angustia",
        "afortunado",
        "alma",
        "encefalograma",
        "materialidad",
        "cosas",
        "o",
        "renuncia",
        "error",
        "menos",
        "conejo",
        "abadía",
        "analfabeto",
        "remo",
        "fugacidad",
        "oficio",
        "en",
        "almácigo",
        "vos",
        "pan",
        "represión",
        "números",
        "triste",
        "refugiado",
        "trote",
        "inventor",
        "corchea",
        "repelente",
        "magma",
        "recusado",
        "patrón",
        "explícito",
        "paloma",
        "síndrome",
        "inmune",
        "autoinmune",
        "comodidad",
        "ley",
        "vietnamita",
        "demonio",
        "tasmania",
        "repeler",
        "apéndice",
        "arquitecto",
        "columna",
        "yugo",
        "computador",
        "mula",
        "a",
        "propósito",
        "fantasía",
        "alias",
        "rayo",
        "tenedor",
        "deleznable",
        "ventana",
        "cara",
        "anemia",
        "corrupto"
    ]
};
var langs = { latin, ru, sp };
var defaultOptions$4 = {
    wordCount: 30,
    skipCommon: false,
    lang: "latin"
};
var index$8 = function (node, options) {
    options = Object.assign({}, defaultOptions$4, options);
    var dict = langs[options.lang] || langs.latin;
    var startWithCommon = !options.skipCommon && !isRepeating(node);
    if (!node.repeat && !isRoot$1(node.parent)) {
        node.parent.value = paragraph(dict, options.wordCount, startWithCommon);
        node.remove();
    } else {
        node.value = paragraph(dict, options.wordCount, startWithCommon);
        node.name = node.parent.name ? resolveImplicitName(node.parent.name) : null;
    }
    return node;
};
function isRoot$1(node) {
    return !node.parent;
}
function rand(from, to2) {
    return Math.floor(Math.random() * (to2 - from) + from);
}
function sample(arr, count) {
    var len = arr.length;
    var iterations = Math.min(len, count);
    var result = new Set();
    while (result.size < iterations) {
        result.add(arr[rand(0, len)]);
    }
    return Array.from(result);
}
function choice(val) {
    return val[rand(0, val.length - 1)];
}
function sentence(words, end) {
    if (words.length) {
        words = [capitalize(words[0])].concat(words.slice(1));
    }
    return words.join(" ") + (end || choice("?!..."));
}
function capitalize(word) {
    return word[0].toUpperCase() + word.slice(1);
}
function insertCommas(words) {
    if (words.length < 2) {
        return words;
    }
    words = words.slice();
    var len = words.length;
    var hasComma = /,$/;
    var totalCommas = 0;
    if (len > 3 && len <= 6) {
        totalCommas = rand(0, 1);
    } else if (len > 6 && len <= 12) {
        totalCommas = rand(0, 2);
    } else {
        totalCommas = rand(1, 4);
    }
    for (var i = 0, pos2 = void 0; i < totalCommas; i++) {
        pos2 = rand(0, len - 2);
        if (!hasComma.test(words[pos2])) {
            words[pos2] += ",";
        }
    }
    return words;
}
function paragraph(dict, wordCount, startWithCommon) {
    var result = [];
    var totalWords = 0;
    var words;
    if (startWithCommon && dict.common) {
        words = dict.common.slice(0, wordCount);
        totalWords += words.length;
        result.push(sentence(insertCommas(words), "."));
    }
    while (totalWords < wordCount) {
        words = sample(dict.words, Math.min(rand(2, 30), wordCount - totalWords));
        totalWords += words.length;
        result.push(sentence(insertCommas(words)));
    }
    return result.join(" ");
}
function isRepeating(node) {
    while (node.parent) {
        if (node.repeat && node.repeat.value && node.repeat.value > 1) {
            return true;
        }
        node = node.parent;
    }
    return false;
}
function replaceVariables(tree, variables) {
    variables = variables || {};
    tree.walk(function (node) {
        return replaceInNode(node, variables);
    });
    return tree;
}
function replaceInNode(node, variables) {
    var attrs = node.attributes;
    for (var i = 0, il = attrs.length; i < il; i++) {
        var attr = attrs[i];
        if (typeof attr.value === "string") {
            node.setAttribute(attr.name, replaceInString(attr.value, variables));
        }
    }
    if (node.value != null) {
        node.value = replaceInString(node.value, variables);
    }
    return node;
}
function replaceInString(string, variables) {
    var model = createModel(string);
    var offset = 0;
    var output = "";
    for (var i = 0, il = model.variables.length; i < il; i++) {
        var v2 = model.variables[i];
        var value = v2.name in variables ? variables[v2.name] : v2.name;
        if (typeof value === "function") {
            value = value(model.string, v2, offset + v2.location);
        }
        output += model.string.slice(offset, v2.location) + value;
        offset = v2.location + v2.length;
    }
    return output + model.string.slice(offset);
}
function createModel(string) {
    var reVariable = /\$\{([a-z][\w\-]*)\}/ig;
    var escapeCharCode = 92;
    var variables = [];
    var tokens = new Map();
    var m2;
    while (m2 = reVariable.exec(string)) {
        tokens.set(m2.index, m2);
    }
    if (tokens.size) {
        var start = 0, pos2 = 0, len = string.length;
        var output = "";
        while (pos2 < len) {
            if (string.charCodeAt(pos2) === escapeCharCode && tokens.has(pos2 + 1)) {
                var token = tokens.get(pos2 + 1);
                output += string.slice(start, pos2) + token[0];
                start = pos2 = token.index + token[0].length;
                tokens.delete(pos2 + 1);
                continue;
            }
            pos2++;
        }
        string = output + string.slice(start);
        var validMatches = Array.from(tokens.values());
        for (var i = 0, il = validMatches.length; i < il; i++) {
            var token$1 = validMatches[i];
            variables.push({
                name: token$1[1],
                location: token$1.index,
                length: token$1[0].length
            });
        }
    }
    return { string, variables };
}
var htmlData = {
    tags: [
        "body",
        "head",
        "html",
        "address",
        "blockquote",
        "dd",
        "div",
        "section",
        "article",
        "aside",
        "header",
        "footer",
        "nav",
        "menu",
        "dl",
        "dt",
        "fieldset",
        "form",
        "frame",
        "frameset",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "iframe",
        "noframes",
        "object",
        "ol",
        "p",
        "ul",
        "applet",
        "center",
        "dir",
        "hr",
        "pre",
        "a",
        "abbr",
        "acronym",
        "area",
        "b",
        "base",
        "basefont",
        "bdo",
        "big",
        "br",
        "button",
        "caption",
        "cite",
        "code",
        "col",
        "colgroup",
        "del",
        "dfn",
        "em",
        "font",
        "head",
        "html",
        "i",
        "img",
        "input",
        "ins",
        "isindex",
        "kbd",
        "label",
        "legend",
        "li",
        "link",
        "map",
        "meta",
        "noscript",
        "optgroup",
        "option",
        "param",
        "q",
        "s",
        "samp",
        "script",
        "select",
        "small",
        "span",
        "strike",
        "strong",
        "style",
        "sub",
        "sup",
        "table",
        "tbody",
        "td",
        "textarea",
        "tfoot",
        "th",
        "thead",
        "title",
        "tr",
        "tt",
        "u",
        "var",
        "canvas",
        "main",
        "figure",
        "plaintext"
    ]
};
htmlData.tags.forEach(function (tag) {
    return htmlSnippet[tag] = htmlSnippet[tag] || tag;
});
var registry = new SnippetsRegistry(htmlSnippet);
var reLorem = /^lorem([a-z]*)(\d*)$/i;
registry.get(0).set(reLorem, function (node) {
    var option2 = {};
    var _a = node.name.match(reLorem), lang = _a[1], wordCount = _a[2];
    if (lang) {
        option2.lang = lang;
    }
    if (wordCount) {
        option2.wordCount = +wordCount;
    }
    return index$8(node, option2);
});
var markupSnippetKeys = registry.all({ type: "string" }).map(function (snippet) {
    return snippet.key;
});
markupSnippetKeys.push("lorem");
var option$1 = __assign(__assign({}, defaultOption), {
    snippets: registry, profile: new Profile(), variables: {
        lang: "en",
        locale: "en-US",
        charset: "UTF-8"
    }
});
function expand$1(abbr2) {
    var tree = index$3(abbr2).use(index$5, option$1.snippets).use(replaceVariables, option$1.variables).use(index$7, null, null);
    return index$6(tree, option$1.profile, option$1);
}
function emmetHTML(monaco) {
    if (monaco === void 0) {
        monaco = window.monaco;
    }
    if (!checkMonacoExists(monaco)) {
        return;
    }
    return onCompletion(monaco, "typescript", function (tokens, index2) {
        let prev = null;
        for (let i in tokens) {
            const now = tokens[i]
            if (prev) {
                if (prev.type === "delimiter.ts" && now.type === "identifier.ts") {
                    return true;
                }
            }

            prev = now;
        }
        return false
    }, function (str2) {
        if (str2 === "" || str2.match(/\s$/)) {
            return;
        }
        str2 = str2.trim();
        var step = {
            "{": 1,
            "}": -1,
            "[": 1,
            "]": -1
        };
        var pair = 0;
        for (var i = str2.length - 1; i > 0; i--) {
            pair += step[str2[i]] || 0;
            if (str2[i].match(/\s/) && pair >= 0) {
                str2 = str2.substr(i + 1);
                break;
            }
        }
        if (!str2.match(/^[a-zA-Z[(.#!]/)) {
            return;
        }
        var strlen = str2.length;
        var strArr = markupSnippetKeys.filter(function (key) {
            return key.length > strlen && key.slice(0, strlen) === str2;
        });
        strArr.unshift(str2);
        try {
            return strArr.map(function (s) {
                return {
                    emmetText: s,
                    expandText: expand$1(s)
                };
            });
        } catch (_a) {
            return;
        }
    });
}

// buffer.ts
export {
    emmetHTML
};
