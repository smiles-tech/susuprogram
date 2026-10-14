# susuprogram
# Susu group manager

A command-line program for managing one rotating savings group. Run it with:

```sh
npm install # 
npm start
```

Enter the fixed weekly contribution in GHS, then use `help` to see the available commands. For example:

```text
add Ama
add Kofi
add Esi
pay Ama 50.00
pay Kofi 50.00
pay Esi 30.00
close
pay Esi 20.00
close
report
```

Run the automated checks with `npm test` and lint with `npm run lint`.

## Assumptions

- Amounts accept up to two decimal places and are stored as exact pesewas.
- Member names are trimmed and compared without regard to letter case.
- Members may be added only before the first payment or first attempt to close week 1.
- An incomplete close lists each remaining balance and leaves the week open.
- Each member receives one payout in join order; the group completes after one rotation.
- Group data is held in memory and is not saved between runs.