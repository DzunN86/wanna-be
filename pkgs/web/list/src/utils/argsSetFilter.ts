export const argsSetFilter = (e: any, filter: any, newvalue: any) => {
  switch (e._args.type) {
    case "date":
      if (e._args.operator === "monthly" || e._args.operator === "date") {
        filter.form[e._args.from].value = newvalue.from;
        filter.form[e._args.to].value = newvalue.to;
      }
  }
};
