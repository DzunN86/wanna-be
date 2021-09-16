export const argsLoadFilter = (e: any, filter: any) => {

    switch (e._args.type) {
        case "date":
            if (e._args.operator === 'monthly') {
                return {
                    from: filter.form[e._args.from].value,
                    to: filter.form[e._args.to].value,
                }
            }
    }
}