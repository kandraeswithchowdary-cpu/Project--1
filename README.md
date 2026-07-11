# Scientific Calculator Backend

A dependency-free Python backend for evaluating scientific calculator expressions.

## Run

```bash
python server.py
```

The server starts at `http://127.0.0.1:8000`.

Open that URL in a browser to use the calculator interface.

You can choose another port:

```bash
python server.py --port 8080
```

## API

### `GET /health`

Returns:

```json
{ "status": "ok" }
```

### `GET /functions`

Returns supported functions, constants, and angle modes.

### `POST /calculate`

Request:

```json
{
  "expression": "sqrt(81) + sin(90)",
  "angle_mode": "deg"
}
```

Response:

```json
{
  "expression": "sqrt(81) + sin(90)",
  "result": 10.0,
  "angle_mode": "deg"
}
```

`angle_mode` is optional and can be `rad` or `deg`.

## Supported Examples

```text
2 + 3 * 4
2^8
sqrt(81)
sin(pi / 2)
sin(90)
log(1000)
ln(e)
factorial(5)
gcd(48, 18)
```

## Test

```bash
python -m unittest
```
