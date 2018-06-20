.PHONY: clean

clean:
	rm -rf dist/* frontend/dist/*

transpile:
	./node_modules/.bin/tsc -p . --skipLibCheck

static:
	npm run build

container: clean transpile static
	docker build -t fromthestorm/boris .
