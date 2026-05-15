.PHONY: gen install build lint format clean help

GEN_IMAGE          := hexpay-node-gen
OPENAPI_TS_VERSION ?= 0.97.1

help:
	@echo "Available targets:"
	@echo "  gen      Regenerate src/ from oapi/api.yaml via Docker (host Node not required)"
	@echo "  install  pnpm install"
	@echo "  build    Build dual ESM+CJS bundle into dist/"
	@echo "  lint     Lint examples/ (src/ is excluded)"
	@echo "  format   Format examples/ with prettier"
	@echo "  clean    Remove src/, node_modules/, dist/"

gen:
	docker build \
		--build-arg OPENAPI_TS_VERSION=$(OPENAPI_TS_VERSION) \
		-f gen.Dockerfile \
		-t $(GEN_IMAGE) .
	rm -rf src
	docker run --rm \
		-v "$(CURDIR)":/work \
		-w /work \
		--user "$$(id -u):$$(id -g)" \
		$(GEN_IMAGE) \
		--file openapi-ts.config.ts

install:
	pnpm install

build:
	pnpm build

lint:
	pnpm lint

format:
	pnpm format

clean:
	rm -rf src node_modules dist
